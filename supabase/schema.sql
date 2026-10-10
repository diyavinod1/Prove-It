-- =====================================================================
--  Prove it: Supabase schema
--  Paste this whole file into Supabase > SQL Editor > Run. Safe to re-run
--  (it also upgrades an earlier version of this schema in place).
--
--  Data model
--    creators 1 --- * challenges 1 --- * questions
--                                  1 --- * participants 1 --- * attempts 1 --- * responses
--    creators 1 --- * creator_sessions   (random login tokens)
--
--  Security model
--  - Every table has RLS enabled and NO policies, so the public anon key
--    cannot read or write them directly.
--  - The app talks only to the SECURITY DEFINER functions below.
--  - Players get what they need to take a challenge and nothing else: no
--    correct answers, no creator account data, no other challenges.
--  - A creator's "personal answer" is normalised and hashed with bcrypt
--    (pgcrypto crypt) inside Postgres. It is never stored in plain text and
--    no function ever returns it or the hash.
--  - After login the creator holds a random session token. Only its SHA-256
--    is stored, so a database leak does not leak live sessions.
--  - Wrong answers are throttled (5 misses = 15 minute lock) and the login
--    responses for unknown user / wrong answer / locked are identical.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;          -- helpers, not exposed through the API
revoke all on schema private from public;

-- ---------- tables ----------

create table if not exists public.creators (
  id            uuid primary key default gen_random_uuid(),
  username      text not null check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  question      text not null,
  answer_hash   text not null,                 -- bcrypt of the normalised answer
  failed_attempts int not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now()
);

-- Upgrade path for databases created by an earlier build. These columns may not exist
-- when the creators table was already present; add them before the RPCs below are replaced.
alter table public.creators add column if not exists question text;
alter table public.creators add column if not exists answer_hash text;
alter table public.creators add column if not exists failed_attempts int not null default 0;
alter table public.creators add column if not exists locked_until timestamptz;
alter table public.creators add column if not exists created_at timestamptz not null default now();

-- usernames are unique and case-insensitive: Sam123 == sam123
create unique index if not exists creators_username_key on public.creators (lower(username));

create table if not exists public.creator_sessions (
  token_hash    text primary key,              -- sha256(token); the token itself is never stored
  creator_id    uuid not null references public.creators(id) on delete cascade,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null
);

alter table public.creator_sessions add column if not exists creator_id uuid references public.creators(id) on delete cascade;
alter table public.creator_sessions add column if not exists created_at timestamptz not null default now();
alter table public.creator_sessions add column if not exists expires_at timestamptz not null default (now() + interval '30 days');

create index if not exists creator_sessions_creator_idx on public.creator_sessions (creator_id);

create table if not exists public.challenges (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  creator_id    uuid references public.creators(id) on delete cascade,
  creator_name  text not null check (char_length(creator_name) between 1 and 40),
  title         text check (title is null or char_length(title) between 1 and 60),
  closed        boolean not null default false,
  created_at    timestamptz not null default now()
);

-- upgrade path from the first version of this schema (anonymous creator_key)
alter table public.challenges add column if not exists creator_id uuid references public.creators(id) on delete cascade;
alter table public.challenges add column if not exists title text;
alter table public.challenges drop column if exists creator_key;
create index if not exists challenges_creator_idx on public.challenges (creator_id, created_at desc);

create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges(id) on delete cascade,
  position      int  not null,
  prompt        text not null check (char_length(prompt) between 1 and 200),
  options       jsonb not null,
  correct_index int  not null check (correct_index between 0 and 3),
  unique (challenge_id, position)
);

create table if not exists public.participants (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges(id) on delete cascade,
  session_id    text not null,           -- anonymous per-browser id, no account
  name          text not null check (char_length(name) between 1 and 40),
  level         int  not null default 0 check (level between 0 and 4),
  created_at    timestamptz not null default now()
);

-- One participant per browser + name: friends passing one phone around stay separate people,
-- while the same person replaying under the same name is deduped.
create unique index if not exists participants_person_idx
  on public.participants (challenge_id, session_id, (lower(name)));

create table if not exists public.attempts (
  id             uuid primary key default gen_random_uuid(),
  challenge_id   uuid not null references public.challenges(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  score          int not null,
  total          int not null,
  created_at     timestamptz not null default now()
);

create table if not exists public.responses (
  id            uuid primary key default gen_random_uuid(),
  attempt_id    uuid not null references public.attempts(id) on delete cascade,
  question_id   uuid not null references public.questions(id) on delete cascade,
  chosen_index  int not null,
  is_correct    boolean not null,
  unique (attempt_id, question_id)
);

create index if not exists attempts_challenge_idx    on public.attempts (challenge_id);
create index if not exists participants_challenge_idx on public.participants (challenge_id);
create index if not exists responses_attempt_idx     on public.responses (attempt_id);

alter table public.creators          enable row level security;
alter table public.creator_sessions  enable row level security;
alter table public.challenges        enable row level security;
alter table public.questions         enable row level security;
alter table public.participants      enable row level security;
alter table public.attempts          enable row level security;
alter table public.responses         enable row level security;

-- ---------- private helpers (not callable through the API) ----------

-- Keep identical to PERSONAL_QUESTIONS in src/lib/security.ts
create or replace function private.personal_questions() returns text[]
language sql immutable as $$
  select array[
    'What''s your nickname?',
    'What was your childhood nickname?',
    'What''s your favorite food?',
    'What''s your favorite color?',
    'What''s your go-to drink?',
    'What city are you from?',
    'What''s your favorite game?',
    'What do your friends usually call you?'
  ];
$$;

-- lower-case, trim, collapse whitespace. Keep identical to normalizeAnswer() in src/lib/security.ts
create or replace function private.norm_answer(p text) returns text
language sql immutable as $$
  select lower(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'));
$$;

create or replace function private.start_session(p_creator uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_token text := encode(gen_random_bytes(24), 'hex');
begin
  delete from public.creator_sessions where expires_at < now();
  insert into public.creator_sessions (token_hash, creator_id, expires_at)
  values (encode(digest(v_token, 'sha256'), 'hex'), p_creator, now() + interval '30 days');
  return v_token;
end;
$$;

-- Who is this token? null when missing / expired.
create or replace function private.creator_from_token(p_token text) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select s.creator_id
  from public.creator_sessions s
  where s.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and s.expires_at > now();
$$;

-- ---------- creator account ----------

drop function if exists public.register_creator(text, text, text);

create or replace function public.register_creator(p_username text, p_question text, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user  text := btrim(coalesce(p_username, ''));
  v_norm  text := private.norm_answer(p_answer);
  v_id    uuid;
begin
  if v_user !~ '^[A-Za-z0-9_]{3,24}$' then raise exception 'invalid_username'; end if;
  if p_question is null or not (p_question = any (private.personal_questions())) then
    raise exception 'invalid_question';
  end if;
  if char_length(v_norm) not between 2 and 60 then raise exception 'invalid_answer'; end if;

  if exists (select 1 from public.creators where lower(username) = lower(v_user)) then
    raise exception 'username_taken';
  end if;

  begin
    insert into public.creators (username, question, answer_hash)
    values (v_user, p_question, crypt(v_norm, gen_salt('bf', 10)))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'username_taken';       -- lost a race with someone else
  end;

  return jsonb_build_object('token', private.start_session(v_id), 'username', v_user);
end;
$$;

-- The question to show on the login screen. Unknown usernames get a stable decoy question so the
-- screen looks the same and accounts can't be enumerated.
create or replace function public.login_question(p_username text)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_user text := lower(btrim(coalesce(p_username, '')));
  v_q    text;
  v_qs   text[] := private.personal_questions();
begin
  select question into v_q from public.creators where lower(username) = v_user;
  if v_q is not null then return v_q; end if;
  return v_qs[1 + (get_byte(digest(v_user, 'sha256'), 0) % array_length(v_qs, 1))];
end;
$$;

-- Drop the previous signature first so PostgreSQL can safely replace functions
-- whose input parameter names changed between schema versions.
drop function if exists public.login_creator(text, text);

-- Never raises on a wrong answer (a raise would roll back the failure counter).
-- Unknown user, wrong answer and "locked" all return the same {ok:false}.
create or replace function public.login_creator(p_username text, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  c      public.creators%rowtype;
  v_user text := lower(btrim(coalesce(p_username, '')));
  v_norm text := private.norm_answer(p_answer);
begin
  if char_length(v_norm) > 200 then v_norm := left(v_norm, 200); end if;
  select * into c from public.creators where lower(username) = v_user;

  if not found then
    perform crypt(v_norm, gen_salt('bf', 10));        -- spend the same time as a real check
    return jsonb_build_object('ok', false);
  end if;

  if c.locked_until is not null and c.locked_until > now() then
    perform crypt(v_norm, c.answer_hash);
    return jsonb_build_object('ok', false);
  end if;
  if c.locked_until is not null then                  -- lock expired: fresh start
    c.failed_attempts := 0;
  end if;

  if c.answer_hash = crypt(v_norm, c.answer_hash) then
    update public.creators set failed_attempts = 0, locked_until = null where id = c.id;
    return jsonb_build_object('ok', true, 'token', private.start_session(c.id), 'username', c.username);
  end if;

  update public.creators
     set failed_attempts = c.failed_attempts + 1,
         locked_until = case when c.failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end
   where id = c.id;
  return jsonb_build_object('ok', false);
end;
$$;

create or replace function public.get_session(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('username', c.username)
  from public.creators c
  where c.id = private.creator_from_token(p_token);
$$;

create or replace function public.logout_creator(p_token text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  delete from public.creator_sessions
  where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

-- ---------- create_challenge (needs a creator session) ----------

drop function if exists public.create_challenge(text, jsonb);   -- old anonymous version

create or replace function public.create_challenge(
  p_token        text,
  p_creator_name text,
  p_title        text,
  p_questions    jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_creator  uuid := private.creator_from_token(p_token);
  v_name     text := btrim(coalesce(p_creator_name, ''));
  v_title    text := nullif(btrim(coalesce(p_title, '')), '');
  v_alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  v_code     text;
  v_id       uuid;
  v_count    int;
  q          jsonb;
  v_opts     jsonb;
  v_ci       int;
  i          int;
begin
  if v_creator is null then raise exception 'not_authenticated'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 40 then raise exception 'invalid_name'; end if;
  if v_title is not null and char_length(v_title) > 60 then raise exception 'invalid_title'; end if;
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' then
    raise exception 'invalid_questions';
  end if;
  if (select count(*) from public.challenges where creator_id = v_creator) >= 50 then
    raise exception 'too_many_challenges';
  end if;

  v_count := jsonb_array_length(p_questions);
  if v_count < 3 or v_count > 12 then
    raise exception 'invalid_question_count';
  end if;

  for q in select value from jsonb_array_elements(p_questions) loop
    v_opts := q -> 'options';
    if char_length(btrim(coalesce(q ->> 'prompt', ''))) not between 1 and 200 then
      raise exception 'invalid_prompt';
    end if;
    if v_opts is null or jsonb_typeof(v_opts) <> 'array'
       or jsonb_array_length(v_opts) not between 2 and 4 then
      raise exception 'invalid_options';
    end if;
    if exists (
      select 1 from jsonb_array_elements_text(v_opts) o
      where char_length(btrim(o)) not between 1 and 80
    ) then
      raise exception 'invalid_options';
    end if;
    v_ci := (q ->> 'correctIndex')::int;
    if v_ci is null or v_ci < 0 or v_ci >= jsonb_array_length(v_opts) then
      raise exception 'invalid_correct';
    end if;
  end loop;

  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % char_length(v_alphabet)), 1);
    end loop;
    exit when not exists (select 1 from public.challenges where code = v_code);
  end loop;

  insert into public.challenges (code, creator_id, creator_name, title)
  values (v_code, v_creator, v_name, v_title)
  returning id into v_id;

  insert into public.questions (challenge_id, position, prompt, options, correct_index)
  select v_id, (t.ord - 1)::int, btrim(t.e ->> 'prompt'), t.e -> 'options', (t.e ->> 'correctIndex')::int
  from jsonb_array_elements(p_questions) with ordinality as t(e, ord);

  return jsonb_build_object('code', v_code);
end;
$$;

-- ---------- get_challenge (public: no answers) ----------

create or replace function public.get_challenge(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'code',         c.code,
    'creatorName',  c.creator_name,
    'closed',       c.closed,
    'createdAt',    c.created_at,
    'attemptCount', (select count(*) from public.participants p where p.challenge_id = c.id),
    'questions',    coalesce((
      select jsonb_agg(
        jsonb_build_object('id', q.id, 'prompt', q.prompt, 'options', q.options)
        order by q.position
      )
      from public.questions q where q.challenge_id = c.id
    ), '[]'::jsonb)
  )
  from public.challenges c
  where c.code = lower(p_code);
$$;

-- ---------- submit_attempt ----------

create or replace function public.submit_attempt(
  p_code       text,
  p_session_id text,
  p_name       text,
  p_level      int,
  p_answers    jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  c         public.challenges%rowtype;
  v_name    text := btrim(coalesce(p_name, ''));
  v_pid     uuid;
  v_aid     uuid;
  v_total   int;
  v_score   int := 0;
  v_flags   jsonb := '[]'::jsonb;
  v_chosen  int;
  v_ok      boolean;
  r         record;
  v_others  int;
  v_less    int;
  v_tied    int;
begin
  select * into c from public.challenges where code = lower(p_code);
  if not found then raise exception 'challenge_not_found'; end if;
  if c.closed then raise exception 'challenge_closed'; end if;

  if char_length(v_name) < 1 or char_length(v_name) > 40 then raise exception 'invalid_name'; end if;
  if p_session_id is null or char_length(p_session_id) not between 8 and 80 then
    raise exception 'invalid_session';
  end if;

  select count(*) into v_total from public.questions where challenge_id = c.id;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array'
     or jsonb_array_length(p_answers) <> v_total then
    raise exception 'invalid_answers';
  end if;

  insert into public.participants (challenge_id, session_id, name, level)
  values (c.id, p_session_id, v_name, greatest(0, least(4, coalesce(p_level, 0))))
  on conflict (challenge_id, session_id, (lower(name)))
  do update set name = excluded.name, level = excluded.level
  returning id into v_pid;

  insert into public.attempts (challenge_id, participant_id, score, total)
  values (c.id, v_pid, 0, v_total)
  returning id into v_aid;

  for r in
    select id, position, correct_index, options
    from public.questions where challenge_id = c.id order by position
  loop
    v_chosen := (p_answers ->> r.position)::int;
    if v_chosen is null or v_chosen < 0 or v_chosen >= jsonb_array_length(r.options) then
      raise exception 'invalid_answers';
    end if;
    v_ok := (v_chosen = r.correct_index);
    if v_ok then v_score := v_score + 1; end if;
    v_flags := v_flags || to_jsonb(v_ok);
    insert into public.responses (attempt_id, question_id, chosen_index, is_correct)
    values (v_aid, r.id, v_chosen, v_ok);
  end loop;

  update public.attempts set score = v_score where id = v_aid;

  -- compare against every other person's best score
  with best as (
    select participant_id, max(score) as s
    from public.attempts
    where challenge_id = c.id and participant_id <> v_pid
    group by participant_id
  )
  select count(*),
         count(*) filter (where s < v_score),
         count(*) filter (where s = v_score)
  into v_others, v_less, v_tied
  from best;

  return jsonb_build_object(
    'score',       v_score,
    'total',       v_total,
    'flags',       v_flags,
    'othersCount', v_others,
    'beatPercent', case when v_others = 0 then null else round(100.0 * v_less / v_others) end,
    'tiedPercent', case when v_others = 0 then 0    else round(100.0 * v_tied / v_others) end
  );
end;
$$;

-- ---------- creator dashboard (needs a creator session; scoped to that creator) ----------

create or replace function public.list_my_challenges(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_creator uuid := private.creator_from_token(p_token);
begin
  if v_creator is null then raise exception 'not_authenticated'; end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'code',          c.code,
        'title',         c.title,
        'creatorName',   c.creator_name,
        'closed',        c.closed,
        'createdAt',     c.created_at,
        'questionCount', (select count(*) from public.questions q where q.challenge_id = c.id),
        'people',        st.people,
        'attempts',      st.n,
        'average',       coalesce(round(st.av, 1), 0),
        'high',          coalesce(st.hi, 0),
        'low',           coalesce(st.lo, 0)
      )
      order by c.created_at desc
    )
    from public.challenges c
    left join lateral (
      select count(*) as n, count(distinct a.participant_id) as people,
             avg(a.score) as av, max(a.score) as hi, min(a.score) as lo
      from public.attempts a where a.challenge_id = c.id
    ) st on true
    where c.creator_id = v_creator
  ), '[]'::jsonb);
end;
$$;

-- The full leaderboard data for ONE challenge, and only if this creator owns it.
drop function if exists public.get_creator_view(text, text);

create or replace function public.get_creator_view(p_code text, p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_creator uuid := private.creator_from_token(p_token);
  c public.challenges%rowtype;
begin
  if v_creator is null then raise exception 'not_authenticated'; end if;

  select * into c from public.challenges where code = lower(p_code) and creator_id = v_creator;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'code',        c.code,
    'title',       c.title,
    'creatorName', c.creator_name,
    'closed',      c.closed,
    'createdAt',   c.created_at,
    'questions',   coalesce((
      select jsonb_agg(
        jsonb_build_object('id', q.id, 'prompt', q.prompt, 'options', q.options, 'correctIndex', q.correct_index)
        order by q.position
      )
      from public.questions q where q.challenge_id = c.id
    ), '[]'::jsonb),
    'attempts',    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',            a.id,
          'participantId', a.participant_id,
          'name',          p.name,
          'level',         p.level,
          'score',         a.score,
          'total',         a.total,
          'createdAt',     a.created_at,
          'answers',       (
            select coalesce(jsonb_agg(r.chosen_index order by q.position), '[]'::jsonb)
            from public.responses r
            join public.questions q on q.id = r.question_id
            where r.attempt_id = a.id
          )
        )
        order by a.created_at desc
      )
      from public.attempts a
      join public.participants p on p.id = a.participant_id
      where a.challenge_id = c.id
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------- close / reopen / delete (owner only) ----------

drop function if exists public.set_challenge_closed(text, text, boolean);

create or replace function public.set_challenge_closed(p_code text, p_token text, p_closed boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid := private.creator_from_token(p_token);
begin
  if v_creator is null then raise exception 'not_authenticated'; end if;
  update public.challenges set closed = p_closed where code = lower(p_code) and creator_id = v_creator;
  if not found then raise exception 'forbidden'; end if;
end;
$$;

create or replace function public.delete_challenge(p_code text, p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid := private.creator_from_token(p_token);
begin
  if v_creator is null then raise exception 'not_authenticated'; end if;
  delete from public.challenges where code = lower(p_code) and creator_id = v_creator;
  if not found then raise exception 'forbidden'; end if;
end;
$$;

-- ---------- permissions ----------

revoke all on function public.register_creator(text, text, text)                    from public;
revoke all on function public.login_question(text)                                  from public;
revoke all on function public.login_creator(text, text)                             from public;
revoke all on function public.get_session(text)                                     from public;
revoke all on function public.logout_creator(text)                                  from public;
revoke all on function public.create_challenge(text, text, text, jsonb)             from public;
revoke all on function public.get_challenge(text)                                   from public;
revoke all on function public.submit_attempt(text, text, text, int, jsonb)          from public;
revoke all on function public.list_my_challenges(text)                              from public;
revoke all on function public.get_creator_view(text, text)                          from public;
revoke all on function public.set_challenge_closed(text, text, boolean)             from public;
revoke all on function public.delete_challenge(text, text)                          from public;

grant execute on function public.register_creator(text, text, text)                 to anon, authenticated;
grant execute on function public.login_question(text)                               to anon, authenticated;
grant execute on function public.login_creator(text, text)                          to anon, authenticated;
grant execute on function public.get_session(text)                                  to anon, authenticated;
grant execute on function public.logout_creator(text)                               to anon, authenticated;
grant execute on function public.create_challenge(text, text, text, jsonb)          to anon, authenticated;
grant execute on function public.get_challenge(text)                                to anon, authenticated;
grant execute on function public.submit_attempt(text, text, text, int, jsonb)       to anon, authenticated;
grant execute on function public.list_my_challenges(text)                           to anon, authenticated;
grant execute on function public.get_creator_view(text, text)                       to anon, authenticated;
grant execute on function public.set_challenge_closed(text, text, boolean)          to anon, authenticated;
grant execute on function public.delete_challenge(text, text)                       to anon, authenticated;

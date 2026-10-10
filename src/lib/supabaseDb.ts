import { createClient } from '@supabase/supabase-js';
import {
  ChallengeClosedError,
  UnauthorizedError,
  UsernameTakenError,
  type AttemptInput,
  type AttemptResult,
  type AuthResult,
  type ChallengeSummary,
  type CreateInput,
  type CreateOutput,
  type CreatorView,
  type Db,
  type PublicChallenge,
} from './types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

/**
 * All access goes through SECURITY DEFINER functions (see supabase/schema.sql).
 * The tables are locked down by RLS, so correct answers and account data can never be read directly.
 * The personal answer is sent once over HTTPS and hashed (bcrypt) inside Postgres; it is never stored
 * or returned. After login the app only holds a random session token.
 */
export function makeSupabaseDb(): Db {
  const sb = createClient(url as string, anonKey as string, { auth: { persistSession: false } });

  async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
    const { data, error } = await sb.rpc(fn, args);
    if (error) {
      const m = error.message || 'Supabase request failed';
      const code = (error as { code?: string }).code || '';
      if (m.includes('challenge_closed')) throw new ChallengeClosedError();
      if (m.includes('not_authenticated')) throw new UnauthorizedError();
      if (m.includes('username_taken')) throw new UsernameTakenError();
      // Keep the real RPC/schema error available to the UI instead of turning every
      // PostgREST failure into a misleading "check your connection" message.
      const e = new Error(m);
      e.name = code || 'SupabaseError';
      throw e;
    }
    return (data as T | null) ?? null;
  }

  return {
    mode: 'supabase',

    getChallenge(code: string): Promise<PublicChallenge | null> {
      return rpc<PublicChallenge>('get_challenge', { p_code: code.toLowerCase() });
    },

    async submitAttempt(input: AttemptInput): Promise<AttemptResult> {
      const out = await rpc<AttemptResult>('submit_attempt', {
        p_code: input.code.toLowerCase(),
        p_session_id: input.sessionId,
        p_name: input.name.trim(),
        p_level: input.level,
        p_answers: input.answers,
      });
      if (!out) throw new Error('submit_failed');
      return out;
    },

    async registerCreator(username: string, question: string, answer: string): Promise<AuthResult> {
      const out = await rpc<AuthResult>('register_creator', {
        p_username: username.trim(),
        p_question: question,
        p_answer: answer,
      });
      if (!out) throw new Error('register_failed');
      return out;
    },

    async getLoginQuestion(username: string): Promise<string> {
      const q = await rpc<string>('login_question', { p_username: username.trim() });
      return q ?? '';
    },

    async loginCreator(username: string, answer: string): Promise<AuthResult | null> {
      const out = await rpc<{ ok: boolean; token?: string; username?: string }>('login_creator', {
        p_username: username.trim(),
        p_answer: answer,
      });
      if (!out || !out.ok || !out.token || !out.username) return null;
      return { token: out.token, username: out.username };
    },

    async getSession(token: string): Promise<{ username: string } | null> {
      return rpc<{ username: string }>('get_session', { p_token: token });
    },

    async logout(token: string): Promise<void> {
      await rpc('logout_creator', { p_token: token });
    },

    async createChallenge(token: string, input: CreateInput): Promise<CreateOutput> {
      const out = await rpc<CreateOutput>('create_challenge', {
        p_token: token,
        p_creator_name: input.creatorName.trim(),
        p_title: input.title?.trim() || null,
        p_questions: input.questions.map((q) => ({
          prompt: q.prompt.trim(),
          options: q.options.map((o) => o.trim()),
          correctIndex: q.correctIndex,
        })),
      });
      if (!out) throw new Error('create_failed');
      return out;
    },

    async listMyChallenges(token: string): Promise<ChallengeSummary[]> {
      return (await rpc<ChallengeSummary[]>('list_my_challenges', { p_token: token })) ?? [];
    },

    getCreatorView(code: string, token: string): Promise<CreatorView | null> {
      return rpc<CreatorView>('get_creator_view', { p_code: code.toLowerCase(), p_token: token });
    },

    async setClosed(code: string, token: string, closed: boolean): Promise<void> {
      await rpc('set_challenge_closed', { p_code: code.toLowerCase(), p_token: token, p_closed: closed });
    },

    async deleteChallenge(code: string, token: string): Promise<void> {
      await rpc('delete_challenge', { p_code: code.toLowerCase(), p_token: token });
    },
  };
}

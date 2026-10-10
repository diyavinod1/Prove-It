import {
  ChallengeClosedError,
  LIMITS,
  UnauthorizedError,
  UsernameTakenError,
  type AttemptInput,
  type AttemptResult,
  type AuthResult,
  type ChallengeSummary,
  type CreateInput,
  type CreateOutput,
  type CreatorAttempt,
  type CreatorView,
  type Db,
  type PublicChallenge,
} from './types';
import { getItem, setItem } from './storage';
import { randomString, uid } from './utils';
import { hashAnswer, sha256 } from './hash';
import { MAX_ANSWER, MIN_ANSWER, PERSONAL_QUESTIONS, normalizeAnswer, usernameIssue } from './security';

/**
 * Zero-setup backend: everything lives in this browser's localStorage.
 * Great for trying the app. Links only work in the same browser, so use Supabase to really share.
 * Even here the personal answer is only ever stored as a salted hash.
 */

const KEY = 'proveit:localdb:v2';
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const SESSION_MS = 30 * 24 * 3600 * 1000;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const MAX_CHALLENGES = 50;

interface LocalQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}
interface LocalCreator {
  id: string;
  username: string;
  question: string;
  salt: string;
  hash: string;
  failed: number;
  lockedUntil: number;
}
interface LocalChallenge {
  code: string;
  creatorId: string;
  creatorName: string;
  title: string | null;
  closed: boolean;
  createdAt: string;
  questions: LocalQuestion[];
  participants: Record<string, { id: string; name: string; level: number }>;
  attempts: CreatorAttempt[];
}
interface Store {
  creators: Record<string, LocalCreator>; // key = lower-case username
  sessions: Record<string, { creatorId: string; expires: number }>; // key = sha256(token)
  challenges: Record<string, LocalChallenge>;
}

function read(): Store {
  try {
    const s = JSON.parse(getItem(KEY) ?? '{}') as Partial<Store>;
    return { creators: s.creators ?? {}, sessions: s.sessions ?? {}, challenges: s.challenges ?? {} };
  } catch {
    return { creators: {}, sessions: {}, challenges: {} };
  }
}
function write(s: Store): void {
  setItem(KEY, JSON.stringify(s));
}

function creatorFromToken(store: Store, token: string): LocalCreator {
  const sess = store.sessions[sha256(token || '')];
  if (!sess || sess.expires < Date.now()) throw new UnauthorizedError();
  const c = Object.values(store.creators).find((x) => x.id === sess.creatorId);
  if (!c) throw new UnauthorizedError();
  return c;
}

function startSession(store: Store, c: LocalCreator): AuthResult {
  const token = randomString(40, ALPHABET + 'ABCDEFGHJKLMNPQRSTUVWXYZ');
  store.sessions[sha256(token)] = { creatorId: c.id, expires: Date.now() + SESSION_MS };
  return { token, username: c.username };
}

function decoyQuestion(username: string): string {
  const n = parseInt(sha256(username.trim().toLowerCase()).slice(0, 8), 16);
  return PERSONAL_QUESTIONS[n % PERSONAL_QUESTIONS.length];
}

export function makeLocalDb(): Db {
  return {
    mode: 'local',

    /* ---------------- public ---------------- */

    async getChallenge(code: string): Promise<PublicChallenge | null> {
      const c = read().challenges[code.toLowerCase()];
      if (!c) return null;
      return {
        code: c.code,
        creatorName: c.creatorName,
        closed: c.closed,
        createdAt: c.createdAt,
        attemptCount: Object.keys(c.participants).length,
        questions: c.questions.map(({ id, prompt, options }) => ({ id, prompt, options })),
      };
    },

    async submitAttempt(input: AttemptInput): Promise<AttemptResult> {
      const store = read();
      const c = store.challenges[input.code.toLowerCase()];
      if (!c) throw new Error('challenge_not_found');
      if (c.closed) throw new ChallengeClosedError();
      const name = input.name.trim();
      if (!name || name.length > 40) throw new Error('invalid_name');
      if (input.answers.length !== c.questions.length) throw new Error('invalid_answers');

      const flags = c.questions.map((q, i) => {
        const a = input.answers[i];
        if (!Number.isInteger(a) || a < 0 || a >= q.options.length) throw new Error('invalid_answers');
        return a === q.correctIndex;
      });
      const score = flags.filter(Boolean).length;
      const total = c.questions.length;

      const level = Math.max(0, Math.min(4, Math.floor(input.level) || 0));
      // One participant per browser + name, so friends passing one phone around stay separate people,
      // while the same person replaying under the same name is still deduped.
      const pkey = `${input.sessionId}::${name.toLowerCase()}`;
      const participant = c.participants[pkey] ?? { id: uid(), name, level };
      participant.name = name;
      participant.level = level;
      c.participants[pkey] = participant;

      c.attempts.push({
        id: uid(),
        participantId: participant.id,
        name,
        level,
        score,
        total,
        createdAt: new Date().toISOString(),
        answers: [...input.answers],
      });
      write(store);

      // Compare against everyone else's best score (this challenge only).
      const best = new Map<string, number>();
      for (const a of c.attempts) {
        if (a.participantId === participant.id) continue;
        best.set(a.participantId, Math.max(best.get(a.participantId) ?? 0, a.score));
      }
      const others = [...best.values()];
      const less = others.filter((s) => s < score).length;
      const tied = others.filter((s) => s === score).length;
      return {
        score,
        total,
        flags,
        othersCount: others.length,
        beatPercent: others.length ? Math.round((100 * less) / others.length) : null,
        tiedPercent: others.length ? Math.round((100 * tied) / others.length) : 0,
      };
    },

    /* ---------------- creator account ---------------- */

    async registerCreator(username: string, question: string, answer: string): Promise<AuthResult> {
      const issue = usernameIssue(username);
      if (issue) throw new Error('invalid_username');
      if (!PERSONAL_QUESTIONS.includes(question)) throw new Error('invalid_question');
      const norm = normalizeAnswer(answer);
      if (norm.length < MIN_ANSWER || norm.length > MAX_ANSWER) throw new Error('invalid_answer');

      const store = read();
      const lower = username.trim().toLowerCase();
      if (store.creators[lower]) throw new UsernameTakenError();

      const salt = randomString(16, ALPHABET);
      const creator: LocalCreator = {
        id: uid(),
        username: username.trim(),
        question,
        salt,
        hash: hashAnswer(norm, salt),
        failed: 0,
        lockedUntil: 0,
      };
      store.creators[lower] = creator;
      const res = startSession(store, creator);
      write(store);
      return res;
    },

    async getLoginQuestion(username: string): Promise<string> {
      const c = read().creators[username.trim().toLowerCase()];
      return c ? c.question : decoyQuestion(username);
    },

    async loginCreator(username: string, answer: string): Promise<AuthResult | null> {
      const store = read();
      const c = store.creators[username.trim().toLowerCase()];
      const norm = normalizeAnswer(answer);
      if (!c) {
        hashAnswer(norm, 'decoy'); // spend similar time either way
        return null;
      }
      if (c.lockedUntil > Date.now()) return null;
      if (c.lockedUntil && c.lockedUntil <= Date.now()) {
        c.failed = 0;
        c.lockedUntil = 0;
      }
      if (c.hash === hashAnswer(norm, c.salt)) {
        c.failed = 0;
        c.lockedUntil = 0;
        const res = startSession(store, c);
        write(store);
        return res;
      }
      c.failed += 1;
      if (c.failed >= MAX_FAILS) c.lockedUntil = Date.now() + LOCK_MS;
      write(store);
      return null;
    },

    async getSession(token: string): Promise<{ username: string } | null> {
      try {
        const c = creatorFromToken(read(), token);
        return { username: c.username };
      } catch {
        return null;
      }
    },

    async logout(token: string): Promise<void> {
      const store = read();
      delete store.sessions[sha256(token || '')];
      write(store);
    },

    /* ---------------- creator only ---------------- */

    async createChallenge(token: string, input: CreateInput): Promise<CreateOutput> {
      const store = read();
      const creator = creatorFromToken(store, token);
      const name = input.creatorName.trim();
      if (!name || name.length > 40) throw new Error('invalid_name');
      const title = (input.title ?? '').trim();
      if (title.length > 60) throw new Error('invalid_title');
      const n = input.questions.length;
      if (n < 3 || n > LIMITS.maxQuestions) throw new Error('invalid_question_count');
      for (const q of input.questions) {
        const opts = q.options.map((o) => o.trim());
        if (!q.prompt.trim()) throw new Error('invalid_prompt');
        if (opts.length < LIMITS.minOptions || opts.length > LIMITS.maxOptions || opts.some((o) => !o))
          throw new Error('invalid_options');
        if (q.correctIndex < 0 || q.correctIndex >= opts.length) throw new Error('invalid_correct');
      }
      if (Object.values(store.challenges).filter((c) => c.creatorId === creator.id).length >= MAX_CHALLENGES)
        throw new Error('too_many_challenges');

      let code = randomString(8, ALPHABET);
      while (store.challenges[code]) code = randomString(8, ALPHABET);

      store.challenges[code] = {
        code,
        creatorId: creator.id,
        creatorName: name,
        title: title || null,
        closed: false,
        createdAt: new Date().toISOString(),
        questions: input.questions.map((q) => ({
          id: uid(),
          prompt: q.prompt.trim(),
          options: q.options.map((o) => o.trim()),
          correctIndex: q.correctIndex,
        })),
        participants: {},
        attempts: [],
      };
      write(store);
      return { code };
    },

    async listMyChallenges(token: string): Promise<ChallengeSummary[]> {
      const store = read();
      const creator = creatorFromToken(store, token);
      return Object.values(store.challenges)
        .filter((c) => c.creatorId === creator.id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((c) => {
          const scores = c.attempts.map((a) => a.score);
          const sum = scores.reduce((s, n) => s + n, 0);
          return {
            code: c.code,
            title: c.title,
            creatorName: c.creatorName,
            closed: c.closed,
            createdAt: c.createdAt,
            questionCount: c.questions.length,
            people: new Set(c.attempts.map((a) => a.participantId)).size,
            attempts: c.attempts.length,
            average: scores.length ? Math.round((sum / scores.length) * 10) / 10 : 0,
            high: scores.length ? Math.max(...scores) : 0,
            low: scores.length ? Math.min(...scores) : 0,
          };
        });
    },

    async getCreatorView(code: string, token: string): Promise<CreatorView | null> {
      const store = read();
      const creator = creatorFromToken(store, token);
      const c = store.challenges[code.toLowerCase()];
      if (!c || c.creatorId !== creator.id) return null;
      return {
        code: c.code,
        title: c.title,
        creatorName: c.creatorName,
        closed: c.closed,
        createdAt: c.createdAt,
        questions: c.questions.map((q) => ({ ...q })),
        attempts: [...c.attempts].reverse(),
      };
    },

    async setClosed(code: string, token: string, closed: boolean): Promise<void> {
      const store = read();
      const creator = creatorFromToken(store, token);
      const c = store.challenges[code.toLowerCase()];
      if (!c || c.creatorId !== creator.id) throw new Error('forbidden');
      c.closed = closed;
      write(store);
    },

    async deleteChallenge(code: string, token: string): Promise<void> {
      const store = read();
      const creator = creatorFromToken(store, token);
      const c = store.challenges[code.toLowerCase()];
      if (!c || c.creatorId !== creator.id) throw new Error('forbidden');
      delete store.challenges[c.code];
      write(store);
    },
  };
}

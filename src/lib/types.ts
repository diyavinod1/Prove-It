export type ShareStyle = 'curious' | 'competitive' | 'chaotic' | 'minimal';

export const LIMITS = {
  minQuestions: 5,
  targetQuestions: 8,
  maxQuestions: 12,
  minOptions: 2,
  maxOptions: 4,
  maxPrompt: 140,
  maxOption: 60,
  maxName: 30,
} as const;

/** A question while the creator is still building it. correctIndex -1 = not chosen yet. */
export interface DraftQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

/** What a participant is allowed to see: never the answers. */
export interface PublicQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface PublicChallenge {
  code: string;
  creatorName: string;
  closed: boolean;
  createdAt: string;
  attemptCount: number;
  questions: PublicQuestion[];
}

export interface CreateInput {
  creatorName: string;
  /** Optional name for the creator's own dashboard, e.g. "Who actually knows me?" */
  title?: string | null;
  questions: { prompt: string; options: string[]; correctIndex: number }[];
}

export interface CreateOutput {
  code: string;
}

/** Returned after register / login. The token is a random session id, never the personal answer. */
export interface AuthResult {
  token: string;
  username: string;
}

export interface ChallengeSummary {
  code: string;
  title: string | null;
  creatorName: string;
  closed: boolean;
  createdAt: string;
  questionCount: number;
  people: number;
  attempts: number;
  average: number;
  high: number;
  low: number;
}

export interface AttemptInput {
  code: string;
  sessionId: string;
  name: string;
  level: number;
  answers: number[];
}

export interface AttemptResult {
  score: number;
  total: number;
  /** One flag per question: right or wrong. The correct answers themselves are never revealed. */
  flags: boolean[];
  /** % of other people this attempt beat. null when nobody else has played yet. */
  beatPercent: number | null;
  /** % of other people with the same score. */
  tiedPercent: number;
  othersCount: number;
}

export interface CreatorQuestion extends PublicQuestion {
  correctIndex: number;
}

export interface CreatorAttempt {
  id: string;
  participantId: string;
  name: string;
  level: number;
  score: number;
  total: number;
  createdAt: string;
  answers: number[];
}

export interface CreatorView {
  code: string;
  title?: string | null;
  creatorName: string;
  closed: boolean;
  createdAt: string;
  questions: CreatorQuestion[];
  attempts: CreatorAttempt[];
}

export class UsernameTakenError extends Error {
  constructor() {
    super('username_taken');
    this.name = 'UsernameTakenError';
  }
}

/** The creator session is missing, expired or doesn't own the thing being asked for. */
export class UnauthorizedError extends Error {
  constructor() {
    super('not_authenticated');
    this.name = 'UnauthorizedError';
  }
}

export class ChallengeClosedError extends Error {
  constructor() {
    super('challenge_closed');
    this.name = 'ChallengeClosedError';
  }
}

export interface Db {
  mode: 'supabase' | 'local';

  /* ---- public: anyone with the link ---- */
  getChallenge(code: string): Promise<PublicChallenge | null>;
  submitAttempt(input: AttemptInput): Promise<AttemptResult>;

  /* ---- creator account ---- */
  registerCreator(username: string, question: string, answer: string): Promise<AuthResult>;
  /** Always returns a question, even for unknown usernames, so accounts can't be enumerated. */
  getLoginQuestion(username: string): Promise<string>;
  /** null = no match (wrong answer, unknown user or temporarily locked: deliberately indistinguishable). */
  loginCreator(username: string, answer: string): Promise<AuthResult | null>;
  getSession(token: string): Promise<{ username: string } | null>;
  logout(token: string): Promise<void>;

  /* ---- creator only: every call needs a valid session token ---- */
  createChallenge(token: string, input: CreateInput): Promise<CreateOutput>;
  listMyChallenges(token: string): Promise<ChallengeSummary[]>;
  getCreatorView(code: string, token: string): Promise<CreatorView | null>;
  setClosed(code: string, token: string, closed: boolean): Promise<void>;
  deleteChallenge(code: string, token: string): Promise<void>;
}

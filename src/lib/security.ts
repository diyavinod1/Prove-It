/**
 * The personal check: the question a creator picks, and their answer.
 * Keep this list identical to private.personal_questions() in supabase/schema.sql
 * (plain ASCII apostrophes in both).
 */
export const PERSONAL_QUESTIONS: string[] = [
  "What's your nickname?",
  "What was your childhood nickname?",
  "What's your favorite food?",
  "What's your favorite color?",
  "What's your go-to drink?",
  "What city are you from?",
  "What's your favorite game?",
  "What do your friends usually call you?",
];

export const USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;

export function usernameIssue(raw: string): string | null {
  const u = raw.trim();
  if (!u) return 'Pick a username.';
  if (u.length < 3) return 'Make it at least 3 characters.';
  if (u.length > 24) return 'Keep it to 24 characters or fewer.';
  if (!USERNAME_RE.test(u)) return 'Use only letters, numbers and underscores.';
  return null;
}

/** lower-case, trim, collapse spaces. Must match private.norm_answer() in the SQL. */
export function normalizeAnswer(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

export const MIN_ANSWER = 2;
export const MAX_ANSWER = 60;

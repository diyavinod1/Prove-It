import type { DraftQuestion } from './types';

/** Returns a short reason a question isn't ready, or null if it's good to go. */
export function questionIssue(q: DraftQuestion): string | null {
  if (!q.prompt.trim()) return 'Write the question';
  if (q.options.filter((o) => o.trim()).length < 2) return 'Add at least 2 options';
  if (q.correctIndex < 0 || q.correctIndex >= q.options.length) return 'Pick the right answer';
  if (!q.options[q.correctIndex]?.trim()) return "The right answer can't be blank";
  return null;
}

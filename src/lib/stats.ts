import type { CreatorView } from './types';
import { LEVELS } from './tiers';
import { plural } from './utils';

export interface LeaderRow {
  participantId: string;
  name: string;
  level: number;
  score: number;
  total: number;
  tries: number;
  createdAt: string;
}

export interface QuestionStat {
  index: number;
  prompt: string;
  right: number;
  wrong: number;
  total: number;
  percent: number;
  topMiss: string | null;
}

export interface Stats {
  attempts: number;
  average: number;
  high: number;
  low: number;
  total: number;
  leaderboard: LeaderRow[];
  questions: QuestionStat[];
}

export function computeStats(v: CreatorView): Stats {
  const att = v.attempts;
  const byPerson = new Map<string, LeaderRow>();
  for (const a of att) {
    const cur = byPerson.get(a.participantId);
    if (!cur) {
      byPerson.set(a.participantId, {
        participantId: a.participantId,
        name: a.name,
        level: a.level,
        score: a.score,
        total: a.total,
        tries: 1,
        createdAt: a.createdAt,
      });
    } else {
      cur.tries += 1;
      if (a.score > cur.score || (a.score === cur.score && a.createdAt < cur.createdAt)) {
        cur.score = a.score;
        cur.createdAt = a.createdAt;
      }
    }
  }
  const leaderboard = [...byPerson.values()].sort(
    (a, b) => b.score - a.score || (a.createdAt < b.createdAt ? -1 : 1),
  );

  const questions: QuestionStat[] = v.questions.map((q, index) => {
    let right = 0;
    let wrong = 0;
    const misses = new Map<number, number>();
    for (const a of att) {
      const chosen = a.answers[index];
      if (chosen === undefined) continue;
      if (chosen === q.correctIndex) right++;
      else {
        wrong++;
        misses.set(chosen, (misses.get(chosen) ?? 0) + 1);
      }
    }
    let topMiss: string | null = null;
    let best = 0;
    for (const [opt, n] of misses) {
      if (n > best) {
        best = n;
        topMiss = q.options[opt] ?? null;
      }
    }
    const total = right + wrong;
    return { index, prompt: q.prompt, right, wrong, total, percent: total ? Math.round((100 * right) / total) : 0, topMiss };
  });

  const scores = att.map((a) => a.score);
  const sum = scores.reduce((s, n) => s + n, 0);
  return {
    attempts: att.length,
    average: att.length ? Math.round((sum / att.length) * 10) / 10 : 0,
    high: scores.length ? Math.max(...scores) : 0,
    low: scores.length ? Math.min(...scores) : 0,
    total: v.questions.length,
    leaderboard,
    questions,
  };
}

/** The "Interesting... 👀" lines. Short, a little nosy, never mean. */
export function buildInsights(s: Stats): string[] {
  if (s.attempts === 0) return [];
  const out: string[] = [];

  const worst = [...s.questions].sort((a, b) => b.wrong - a.wrong)[0];
  if (worst && worst.wrong > 0) {
    out.push(`${worst.wrong} ${plural(worst.wrong, 'person', 'people')} got Question ${worst.index + 1} wrong.`);
  } else if (s.attempts >= 2) {
    out.push('Nobody missed a single question. Maybe make the next one harder 😏');
  }

  const tooEasy = s.questions.find((q) => q.total >= 3 && q.wrong === 0);
  if (tooEasy && worst && worst.wrong > 0) {
    out.push(`Everyone got Question ${tooEasy.index + 1} right. Too easy?`);
  }

  const bold = s.leaderboard
    .filter((r) => r.level === 4 && r.score / r.total < 0.5)
    .sort((a, b) => a.score - b.score)[0];
  if (bold) {
    out.push(`${bold.name} said "${LEVELS[4].label}" and got ${bold.score}/${bold.total}. 💀`);
  }

  const modest = s.leaderboard.find((r) => r.level <= 1 && r.score / r.total >= 0.9);
  if (modest) {
    out.push(`${modest.name} said "${LEVELS[modest.level].label}" and got ${modest.score}/${modest.total}. Suspicious.`);
  }

  const perfect = s.leaderboard.filter((r) => r.score === r.total);
  if (perfect.length === 1) out.push(`${perfect[0].name} got a perfect score. 👀`);
  else if (perfect.length > 1) out.push(`${perfect.length} people got a perfect score.`);

  return out.slice(0, 4);
}

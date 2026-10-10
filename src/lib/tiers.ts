import type { AttemptResult } from './types';

/* =====================================================================
   Everything here is copy. Edit freely, nothing else depends on wording.
   ===================================================================== */

export interface Level {
  id: number;
  emoji: string;
  label: string;
  blurb: string;
  /** Shown right after picking it. */
  commit: string;
}

/** The "how well do you know them?" confidence mechanic. Order = increasing confidence. */
export const LEVELS: Level[] = [
  { id: 0, emoji: '👀', label: 'I Know Them', blurb: "I've seen them around.", commit: 'Playing it safe. Respect.' },
  { id: 1, emoji: '🙂', label: "We're Cool", blurb: "Yeah, we're friends.", commit: "Solid. Let's see if that holds up." },
  { id: 2, emoji: '🤝', label: 'Pretty Close', blurb: 'I know them pretty well.', commit: 'Confident. Noted.' },
  { id: 3, emoji: '🫂', label: 'Inner Circle', blurb: 'I should absolutely ace this.', commit: "Big claim. Let's see you back it up." },
  {
    id: 4,
    emoji: '🧠',
    label: 'Basically Telepathic',
    blurb: 'There is no way I lose this.',
    commit: "Okay, you chose that. Let's see what you've got.",
  },
];

export interface Tier {
  /** Minimum percentage (0-100) to land in this tier. Keep sorted high to low. */
  min: number;
  emoji: string;
  label: string;
  line: string;
  headlines: ((name: string) => string)[];
}

export const TIERS: Tier[] = [
  {
    min: 90,
    emoji: '🧠',
    label: 'Basically Telepathic',
    line: 'You know them suspiciously well.',
    headlines: [
      (n) => `OKAYYY. You actually know ${n}.`,
      () => 'Suspicious. How do you know this much?',
      (n) => `${n} should be a little worried.`,
    ],
  },
  {
    min: 75,
    emoji: '🫂',
    label: 'Inner Circle',
    line: 'Okay, you actually pay attention.',
    headlines: [(n) => `Respect. You know ${n}.`, () => 'Okay okay, you were listening.'],
  },
  {
    min: 50,
    emoji: '🤝',
    label: 'Pretty Solid',
    line: 'You know them. Mostly.',
    headlines: [() => 'Not bad. Not perfect either.', (n) => `You know ${n}. Mostly.`],
  },
  {
    min: 25,
    emoji: '🙂',
    label: "We're Cool",
    line: "You've got some catching up to do.",
    headlines: [() => 'Hmm. We have some work to do.', (n) => `You know ${n}... a little.`],
  },
  {
    min: 0,
    emoji: '💀',
    label: 'Who Are You?',
    line: 'This friendship needs a software update.',
    headlines: [() => 'Bro... who are you? 💀', (n) => `Did you even meet ${n}? 💀`],
  },
];

export function pctOf(score: number, total: number): number {
  return total > 0 ? (score / total) * 100 : 0;
}

export function tierFor(pct: number): Tier {
  return TIERS.find((t) => pct >= t.min) ?? TIERS[TIERS.length - 1];
}

export function headlineFor(tier: Tier, name: string, score: number): string {
  return tier.headlines[score % tier.headlines.length](name);
}

/** The playful callback to what the player claimed at the start. */
export function claimNote(levelId: number, pct: number): { lead: string; tail: string } | null {
  const level = LEVELS[levelId];
  if (!level) return null;
  if (levelId === 4 && pct < 50) {
    return { lead: `You chose ${level.label}.`, tail: 'We may need to revisit that claim.' };
  }
  if (levelId === 3 && pct < 40) {
    return { lead: `You said ${level.label}.`, tail: 'The circle has questions.' };
  }
  if (levelId === 4 && pct >= 90) {
    return { lead: `You chose ${level.label}.`, tail: 'Claim confirmed. Annoyingly accurate.' };
  }
  if (levelId === 0 && pct >= 75) {
    return { lead: `You said "${level.label}".`, tail: 'You really undersold yourself.' };
  }
  return null;
}

export function percentileLine(r: AttemptResult): string {
  if (r.beatPercent === null) return "You're the first to try this one. The bar is yours.";
  if (r.beatPercent > 0) return `You beat ${r.beatPercent}% of people who took this challenge.`;
  if (r.tiedPercent > 0) return `You tied with ${r.tiedPercent}% of people who took this challenge.`;
  return 'Everyone else scored higher. For now.';
}

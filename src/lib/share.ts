import type { ShareStyle } from './types';

export function baseUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_URL;
  if (configured) return configured.replace(/\/$/, '');
  return window.location.origin;
}
export const challengeUrl = (code: string): string => `${baseUrl()}/challenge/${code}`;
export const resultsPath = (code: string): string => `/challenge/${code}/results`;

export const STYLES: { id: ShareStyle; label: string; emoji: string }[] = [
  { id: 'curious', label: 'Curious', emoji: '👀' },
  { id: 'competitive', label: 'Competitive', emoji: '🔥' },
  { id: 'chaotic', label: 'Chaotic', emoji: '🌀' },
  { id: 'minimal', label: 'Minimal', emoji: '▫️' },
];

/** The message body (no link). The link is appended by whoever sends it. */
export function shareText(style: ShareStyle, count: number): string {
  switch (style) {
    case 'competitive':
      return `You think you know me better than everyone else?\n\nLet's settle that.\n\n${count} questions ↓`;
    case 'chaotic':
      return `I have questions.\n\nYou have answers.\n\nThis could get embarrassing.\n\n↓`;
    case 'minimal':
      return `How well do you actually know me?\n\nFind out ↓`;
    case 'curious':
    default:
      return `👀 I made a challenge about myself.\n\nThink you know me?\n\nProve it ↓`;
  }
}

/** Shorter caption for Instagram DMs / story stickers, where the link sits on its own line. */
export function igText(style: ShareStyle, count: number): string {
  switch (style) {
    case 'competitive':
      return `Think you know me better than everyone? ${count} questions. Prove it 👇`;
    case 'chaotic':
      return `I have questions. You have answers. This could get embarrassing 👇`;
    case 'minimal':
      return `How well do you actually know me? 👇`;
    case 'curious':
    default:
      return `👀 I made a challenge about myself. Think you know me? Prove it 👇`;
  }
}

export const whatsappUrl = (text: string, link: string): string =>
  `https://wa.me/?text=${encodeURIComponent(`${text}\n${link}`)}`;

export function scoreShareText(creatorName: string, score: number, total: number, emoji: string): string {
  return `I got ${score}/${total} on how well I know ${creatorName} ${emoji}\n\nThink you can beat me?`;
}

/** navigator.clipboard only works on https / localhost, so keep an execCommand fallback. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function nativeShare(data: {
  title?: string;
  text: string;
  url: string;
}): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return 'unsupported';
  try {
    await navigator.share(data);
    return 'shared';
  } catch (e) {
    return (e as { name?: string })?.name === 'AbortError' ? 'cancelled' : 'unsupported';
  }
}

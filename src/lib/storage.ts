import type { DraftQuestion, ShareStyle } from './types';
import { uid } from './utils';

// localStorage can throw (private mode, blocked site data, in-app browsers). Fall back to memory.
const mem = new Map<string, string>();

export function getItem(k: string): string | null {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return mem.get(k) ?? null;
  }
}
export function setItem(k: string, v: string): void {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    mem.set(k, v);
  }
}
export function removeItem(k: string): void {
  try {
    window.localStorage.removeItem(k);
  } catch {
    mem.delete(k);
  }
}
function readJson<T>(k: string, fallback: T): T {
  try {
    const raw = getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/* ---------- anonymous identity ---------- */

const SID = 'proveit:sid';
const NAME = 'proveit:name';

/** Anonymous per-browser id, used to dedupe the leaderboard. No account involved. */
export function getSessionId(): string {
  let id = getItem(SID);
  if (!id || id.length < 8) {
    id = uid();
    setItem(SID, id);
  }
  return id;
}
export function getSavedName(): string {
  return getItem(NAME) ?? '';
}
export function saveName(name: string): void {
  setItem(NAME, name);
}

/* ---------- creator session (a random token; the personal answer is never stored here) ---------- */

const AUTH = 'proveit:auth';

export interface StoredAuth {
  token: string;
  username: string;
}
export function loadAuth(): StoredAuth | null {
  const a = readJson<StoredAuth | null>(AUTH, null);
  return a && typeof a.token === 'string' && typeof a.username === 'string' ? a : null;
}
export function saveAuth(a: StoredAuth): void {
  setItem(AUTH, JSON.stringify(a));
}
export function clearAuth(): void {
  removeItem(AUTH);
}

/* ---------- remembered share-message style per challenge ---------- */

const STYLES_KEY = 'proveit:styles';

export function getStyle(code: string): ShareStyle {
  const m = readJson<Record<string, ShareStyle>>(STYLES_KEY, {});
  return m[code] ?? 'curious';
}
export function setStyle(code: string, style: ShareStyle): void {
  const m = readJson<Record<string, ShareStyle>>(STYLES_KEY, {});
  m[code] = style;
  setItem(STYLES_KEY, JSON.stringify(m));
}

/* ---------- unfinished challenge draft ---------- */

const DRAFT = 'proveit:draft';

export interface Draft {
  name: string;
  title?: string;
  questions: DraftQuestion[];
}
export function loadDraft(): Draft | null {
  const d = readJson<Draft | null>(DRAFT, null);
  if (!d || typeof d.name !== 'string' || !Array.isArray(d.questions)) return null;
  return d;
}
export function saveDraft(d: Draft): void {
  setItem(DRAFT, JSON.stringify(d));
}
export function clearDraft(): void {
  removeItem(DRAFT);
}

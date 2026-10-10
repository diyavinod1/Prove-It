import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText } from './share';

/** Copy to clipboard and expose which button (by id) was just copied, for ~2s. */
export function useCopy(timeout = 2000) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const copy = useCallback(
    async (text: string, id = 'default') => {
      const ok = await copyText(text);
      if (ok) {
        setCopied(id);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(null), timeout);
      }
      return ok;
    },
    [timeout],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { copied, copy };
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** False on first paint, true right after: lets CSS width transitions animate in. */
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return m;
}

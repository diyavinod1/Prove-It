import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { db } from './db';
import { clearAuth, loadAuth, saveAuth } from './storage';
import type { AuthResult } from './types';
import { Loading } from '../components/States';

type Status = 'loading' | 'in' | 'out';

interface AuthCtx {
  status: Status;
  token: string | null;
  username: string | null;
  signIn: (r: AuthResult) => void;
  signOut: () => Promise<void>;
  /** Call when the server says the session is no longer valid. */
  expire: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadAuth);
  const [status, setStatus] = useState<Status>(initial ? 'loading' : 'out');
  const [token, setToken] = useState<string | null>(initial?.token ?? null);
  const [username, setUsername] = useState<string | null>(initial?.username ?? null);

  // Check the stored token is still good. If we can't reach the server, trust it for now.
  useEffect(() => {
    if (!initial) return;
    let alive = true;
    db.getSession(initial.token)
      .then((s) => {
        if (!alive) return;
        if (s) {
          setUsername(s.username);
          setStatus('in');
        } else {
          clearAuth();
          setToken(null);
          setUsername(null);
          setStatus('out');
        }
      })
      .catch(() => alive && setStatus('in'));
    return () => {
      alive = false;
    };
  }, [initial]);

  const signIn = useCallback((r: AuthResult) => {
    saveAuth({ token: r.token, username: r.username });
    setToken(r.token);
    setUsername(r.username);
    setStatus('in');
  }, []);

  const expire = useCallback(() => {
    clearAuth();
    setToken(null);
    setUsername(null);
    setStatus('out');
  }, []);

  const signOut = useCallback(async () => {
    const t = token;
    expire();
    if (t) await db.logout(t).catch(() => undefined);
  }, [token, expire]);

  const value = useMemo(
    () => ({ status, token, username, signIn, signOut, expire }),
    [status, token, username, signIn, signOut, expire],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

/** Only allow same-site relative paths as a post-login destination. */
export function safeNext(next: string | null | undefined, fallback = '/my'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}

/** Wrap creator-only pages. Logged-out visitors are sent to login and come back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const loc = useLocation();
  if (status === 'loading') return <Loading />;
  if (status === 'out') {
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  return <>{children}</>;
}

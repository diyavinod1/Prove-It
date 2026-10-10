import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { db } from '../lib/db';
import { safeNext, useAuth } from '../lib/auth';
import { MAX_ANSWER } from '../lib/security';
import { useDocumentTitle } from '../lib/hooks';
import { Shell } from '../components/Shell';
import { Loading } from '../components/States';
import { IconArrowRight } from '../components/icons';

export default function Login() {
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  const { status, signIn } = useAuth();

  const [username, setUsername] = useState('');
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);

  useDocumentTitle('Welcome back');

  if (status === 'loading') return <Shell><Loading /></Shell>;
  if (status === 'in') return <Navigate to={next} replace />;

  async function findQuestion(e: FormEvent) {
    e.preventDefault();
    if (busy || !username.trim()) return;
    setBusy(true);
    setError(null);
    try {
      // The server answers with a question for ANY username, so this screen can't be used to check who has an account.
      const q = await db.getLoginQuestion(username);
      if (!q) throw new Error('no question');
      setQuestion(q);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message ? `Couldn't load that: ${message}` : "Couldn't load that. Check your Supabase setup and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    if (busy || !answer.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await db.loginCreator(username, answer);
      if (res) {
        signIn(res); // status flips to "in" and we navigate to `next`
        return;
      }
      setMisses((n) => n + 1);
      setAnswer('');
      setError("Hmm... that answer doesn't match.");
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message ? `Couldn't check that: ${message}` : "Couldn't check that. Check your Supabase setup and try again.");
    }
    setBusy(false);
  }

  return (
    <Shell>
      <div className="animate-fade-up pt-2">
        <span className="block text-5xl" aria-hidden="true">
          👋
        </span>
        <h1 className="mt-3 text-[38px] font-extrabold leading-[1.02]">Welcome back</h1>
        <p className="mt-3 text-lg text-mute">Get back to your challenges, leaderboards and share links.</p>

        {question === null ? (
          <form onSubmit={findQuestion} className="mt-7" noValidate>
            <label className="block">
              <span className="text-[17px] font-bold">Username</span>
              <input
                className="input mt-2"
                value={username}
                maxLength={24}
                placeholder="Your username"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                spellCheck={false}
                enterKeyHint="go"
                autoFocus
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="mt-3 font-semibold text-coral-deep">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary mt-4 w-full" disabled={busy || !username.trim()}>
              {busy ? 'One sec...' : 'Continue'} {!busy && <IconArrowRight />}
            </button>
          </form>
        ) : (
          <form onSubmit={login} className="mt-7" noValidate>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
              <span className="min-w-0 truncate font-bold">@{username.trim()}</span>
              <button
                type="button"
                className="shrink-0 text-sm font-bold underline underline-offset-4"
                onClick={() => {
                  setQuestion(null);
                  setAnswer('');
                  setError(null);
                  setMisses(0);
                }}
              >
                Change
              </button>
            </div>

            <label className="mt-5 block">
              <span className="block font-display text-[22px] font-extrabold leading-tight">{question}</span>
              <span className="mt-3 block text-[15px] font-semibold text-mute">Your answer</span>
              <input
                className="input mt-1.5"
                value={answer}
                maxLength={MAX_ANSWER}
                placeholder="Type your answer"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
                autoFocus
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setError(null);
                }}
              />
            </label>
            {error && (
              <p id="login-error" role="alert" className="mt-3 animate-shake font-semibold text-coral-deep">
                {error}
                {misses >= 3 && (
                  <span className="mt-1 block text-sm font-medium text-mute">
                    Still stuck? After a few misses we pause for a while. Try again a bit later.
                  </span>
                )}
              </p>
            )}
            <button type="submit" className="btn btn-primary mt-4 w-full" disabled={busy || !answer.trim()}>
              {busy ? 'Checking...' : 'Show My Challenges'} {!busy && <IconArrowRight />}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-mute">
          New here?{' '}
          <Link to="/create" className="font-bold text-ink underline underline-offset-4">
            Make My Challenge
          </Link>
        </p>
      </div>
    </Shell>
  );
}

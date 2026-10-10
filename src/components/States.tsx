import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Loading({ label = 'Hang on...' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
      <div className="flex gap-2" aria-hidden="true">
        {[0, 120, 240].map((d) => (
          <span
            key={d}
            className="h-3 w-3 animate-bounce rounded-full border-2 border-ink bg-lime"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </div>
      <p className="font-display text-xl font-bold">{label}</p>
    </div>
  );
}

interface StateProps {
  emoji: string;
  title: string;
  body?: string;
  children?: ReactNode;
}

export function StateScreen({ emoji, title, body, children }: StateProps) {
  return (
    <div className="flex flex-1 animate-fade-up flex-col items-center justify-center py-10 text-center">
      <div className="text-6xl" aria-hidden="true">
        {emoji}
      </div>
      <h1 className="mt-5 text-[30px] font-extrabold leading-tight">{title}</h1>
      {body && <p className="mt-2 max-w-xs text-lg text-mute">{body}</p>}
      {children && <div className="mt-8 flex w-full max-w-xs flex-col gap-3">{children}</div>}
    </div>
  );
}

export function GoHome() {
  return (
    <Link to="/" className="btn btn-primary">
      Go Home
    </Link>
  );
}

export function NotFoundChallenge() {
  return (
    <StateScreen emoji="🫥" title="Hmm... this challenge doesn't exist." body="Maybe the link got lost.">
      <GoHome />
    </StateScreen>
  );
}

export function ErrorScreen({ onRetry }: { onRetry?: () => void }) {
  return (
    <StateScreen emoji="📡" title="That didn't load." body="Check your connection and try again.">
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Try again
        </button>
      )}
      <GoHome />
    </StateScreen>
  );
}

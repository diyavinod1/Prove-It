import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { useAuth } from '../lib/auth';
import { cx } from '../lib/utils';
import { IconCheck } from './icons';

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Prove it, home"
      className={cx(
        'inline-flex items-center gap-2 rounded-lg font-display text-[22px] font-extrabold tracking-tight',
        className,
      )}
    >
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-lime">
        <IconCheck className="h-[18px] w-[18px]" />
      </span>
      prove it
    </Link>
  );
}

interface ShellProps {
  children: ReactNode;
  /** Allow a wider two-column layout on large screens. */
  wide?: boolean;
  /** Hide the logo bar to give the quiz the full screen. */
  hideHeader?: boolean;
}

export function Shell({ children, wide, hideHeader }: ShellProps) {
  const { status, username } = useAuth();
  return (
    <div
      className={cx(
        'mx-auto flex min-h-dvh w-full flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] md:px-8',
        wide ? 'max-w-[520px] md:max-w-[640px] lg:max-w-[1080px]' : 'max-w-[520px] md:max-w-[600px]',
      )}
    >
      {!hideHeader && (
        <header className="flex h-14 shrink-0 items-center justify-between">
          <Logo />
          <div className="flex min-w-0 items-center gap-2">
            {db.mode === 'local' && (
              <span
                className={`chip !py-1 text-xs ${status === 'in' ? 'hidden min-[430px]:inline-flex' : ''}`}
                title="Challenges are saved in this browser only. See the README to connect Supabase."
              >
                Demo mode
              </span>
            )}
            {status === 'in' && username && (
              <Link
                to="/my"
                aria-label={`@${username}, my challenges`}
                className="chip max-w-[150px] !py-1.5 hover:border-ink/40"
              >
                <span className="truncate">@{username}</span>
              </Link>
            )}
          </div>
        </header>
      )}
      <main className="flex flex-1 flex-col py-3">{children}</main>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { UnauthorizedError, type CreatorView } from '../lib/types';
import { LEVELS } from '../lib/tiers';
import { buildInsights, computeStats } from '../lib/stats';
import { useAuth } from '../lib/auth';
import { challengeUrl, igText, shareText, whatsappUrl } from '../lib/share';
import { useCopy, useDocumentTitle, useMounted } from '../lib/hooks';
import { cx, plural } from '../lib/utils';
import { Shell } from '../components/Shell';
import { ErrorScreen, GoHome, Loading, StateScreen } from '../components/States';
import { IconArrowLeft, IconArrowRight, IconCheck, IconCopy, IconRefresh, IconWhatsapp } from '../components/icons';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Results() {
  const { code = '' } = useParams<{ code: string }>();
  const { token, expire } = useAuth();
  const [view, setView] = useState<CreatorView | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'notmine' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const { copied, copy } = useCopy();
  const mounted = useMounted();

  useDocumentTitle('Who actually knows me?');

  const fetchView = useCallback(
    async (silent: boolean) => {
      if (!token) return;
      if (silent) setRefreshing(true);
      else setPhase('loading');
      try {
        const v = await db.getCreatorView(code, token);
        if (!v) return setPhase('notmine');
        setView(v);
        setPhase('ready');
      } catch (e) {
        if (e instanceof UnauthorizedError) expire();
        else if (!silent) setPhase('error');
      } finally {
        setRefreshing(false);
      }
    },
    [code, token, expire],
  );

  useEffect(() => {
    void fetchView(false);
  }, [fetchView]);

  // Quietly pull in new scores while the page is open.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') void fetchView(true);
    }, 15000);
    return () => window.clearInterval(t);
  }, [fetchView]);

  const stats = useMemo(() => (view ? computeStats(view) : null), [view]);
  const insights = useMemo(() => (stats ? buildInsights(stats) : []), [stats]);

  async function toggleClosed() {
    if (!view || toggling || !token) return;
    const next = !view.closed;
    if (next && !window.confirm('Close this challenge? Nobody new will be able to play.')) return;
    setToggling(true);
    try {
      await db.setClosed(code, token, next);
      setView({ ...view, closed: next });
    } finally {
      setToggling(false);
    }
  }

  if (phase === 'loading')
    return (
      <Shell>
        <Loading />
      </Shell>
    );
  if (phase === 'error')
    return (
      <Shell>
        <ErrorScreen onRetry={() => fetchView(false)} />
      </Shell>
    );
  if (phase === 'notmine' || !view || !stats)
    return (
      <Shell>
        <StateScreen
          emoji="🔐"
          title="We couldn't find that in your challenges."
          body="Leaderboards are private to the person who made the challenge."
        >
          <Link to="/my" className="btn btn-primary">
            My Challenges
          </Link>
          <GoHome />
        </StateScreen>
      </Shell>
    );

  const link = challengeUrl(code);
  const text = shareText('curious', view.questions.length);
  const rows = stats.leaderboard;

  return (
    <Shell wide>
      <div className="animate-fade-up">
        <Link to="/my" className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-bold">
          <IconArrowLeft className="h-4 w-4" /> My Challenges
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[34px] font-extrabold leading-[1.02] sm:text-5xl">Who actually knows me?</h1>
            <p className="mt-2 text-mute">
              {view.title || `${view.creatorName}'s challenge`}
              {view.closed ? ' · closed' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchView(true)}
            aria-label="Refresh results"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-ink/15 bg-white hover:border-ink/40"
          >
            <IconRefresh className={cx('h-5 w-5', refreshing && 'animate-spin')} />
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Attempts', String(stats.attempts)],
            ['Average', stats.attempts ? `${stats.average}/${stats.total}` : '-'],
            ['Highest', stats.attempts ? `${stats.high}/${stats.total}` : '-'],
            ['Lowest', stats.attempts ? `${stats.low}/${stats.total}` : '-'],
          ].map(([label, value]) => (
            <div key={label} className="card px-4 py-3">
              <dt className="text-sm font-semibold text-mute">{label}</dt>
              <dd className="font-display text-3xl font-extrabold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        {stats.attempts === 0 ? (
          <div className="card mt-6 p-6 text-center">
            <div className="text-5xl" aria-hidden="true">
              🦗
            </div>
            <h2 className="mt-3 text-2xl font-extrabold">Nobody's tried yet.</h2>
            <p className="mt-1 text-mute">Send it to someone who swears they know you.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn btn-primary flex-1" onClick={() => copy(link, 'link')}>
                {copied === 'link' ? (
                  <>
                    <IconCheck /> Link copied
                  </>
                ) : (
                  <>
                    <IconCopy /> Copy Link
                  </>
                )}
              </button>
              <a
                className="btn btn-secondary flex-1"
                href={whatsappUrl(text, link)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconWhatsapp /> WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <section aria-labelledby="board">
                <h2 id="board" className="text-2xl font-extrabold">
                  The leaderboard
                </h2>
                <ol className="mt-3 flex flex-col gap-2.5">
                  {rows.map((r, i) => (
                    <li
                      key={r.participantId}
                      className={cx(
                        'card flex min-h-[64px] animate-fade-up items-center gap-3 px-4 py-2.5',
                        i === 0 && 'border-ink bg-lime-soft',
                      )}
                      style={{ animationDelay: `${Math.min(i, 10) * 55}ms` }}
                    >
                      <span className="w-8 shrink-0 text-center font-display text-xl font-extrabold" aria-label={`Rank ${i + 1}`}>
                        {MEDALS[i] ?? i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] font-bold">{r.name}</span>
                        <span className="block truncate text-sm text-mute">
                          <span aria-hidden="true">{LEVELS[r.level]?.emoji}</span> said "{LEVELS[r.level]?.label}"
                          {r.tries > 1 && ` · ${r.tries} tries`}
                        </span>
                      </span>
                      <span className="shrink-0 font-display text-2xl font-extrabold tabular-nums">
                        {r.score}/{r.total}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              {insights.length > 0 && (
                <section aria-labelledby="insights" className="mt-8">
                  <h2 id="insights" className="text-2xl font-extrabold">
                    Interesting... 👀
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {insights.map((line) => (
                      <li key={line} className="rounded-2xl bg-ink px-4 py-3.5 text-[17px] font-semibold leading-snug text-paper">
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <section aria-labelledby="qstats">
              <h2 id="qstats" className="text-2xl font-extrabold">
                Question by question
              </h2>
              <p className="text-sm text-mute">How many people got each one right.</p>
              <ul className="mt-3 flex flex-col gap-3">
                {stats.questions.map((q) => (
                  <li key={q.index} className="card px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words font-semibold leading-snug">
                        <span className="text-mute">Q{q.index + 1}</span> {q.prompt}
                      </p>
                      <span className="shrink-0 font-display text-xl font-extrabold tabular-nums">{q.percent}%</span>
                    </div>
                    <div
                      className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10"
                      role="img"
                      aria-label={`${q.right} of ${q.total} got it right`}
                    >
                      <div
                        className={cx(
                          'h-full rounded-full transition-[width] duration-700 ease-out',
                          q.percent >= 50 ? 'bg-lime ring-1 ring-inset ring-ink' : 'bg-coral',
                        )}
                        style={{ width: mounted ? `${q.percent}%` : '0%' }}
                      />
                    </div>
                    <p className="mt-1.5 text-sm text-mute">
                      {q.right} of {q.total} {plural(q.total, 'person', 'people')} got it
                      {q.topMiss ? ` · most common miss: ${q.topMiss}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-3 border-t-2 border-ink/10 pt-6 sm:flex-row">
          <button type="button" className="btn btn-primary flex-1" onClick={() => copy(`${igText('curious', view.questions.length)}\n${link}`, 'again')}>
            {copied === 'again' ? (
              <>
                <IconCheck /> Copied
              </>
            ) : (
              <>
                <IconCopy /> Copy message + link
              </>
            )}
          </button>
          <Link to="/create" className="btn btn-secondary flex-1">
            Make another <IconArrowRight />
          </Link>
        </div>
        <button type="button" className="btn btn-quiet mt-2 w-full text-[15px] text-mute" onClick={toggleClosed} disabled={toggling}>
          {view.closed ? 'Reopen this challenge' : 'Close this challenge'}
        </button>
      </div>
    </Shell>
  );
}

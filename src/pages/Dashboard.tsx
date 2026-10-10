import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { useAuth } from '../lib/auth';
import { UnauthorizedError, type ChallengeSummary } from '../lib/types';
import { getStyle } from '../lib/storage';
import { challengeUrl, nativeShare, resultsPath, shareText } from '../lib/share';
import { useCopy, useDocumentTitle } from '../lib/hooks';
import { formatDate, plural } from '../lib/utils';
import { Shell } from '../components/Shell';
import { ErrorScreen, Loading, StateScreen } from '../components/States';
import { IconArrowRight, IconCheck, IconCopy, IconEye, IconPlus, IconShare } from '../components/icons';

export default function Dashboard() {
  const { token, username, signOut, expire } = useAuth();
  const [items, setItems] = useState<ChallengeSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { copied, copy } = useCopy();

  useDocumentTitle('My Challenges');

  const load = useCallback(async () => {
    if (!token) return;
    setFailed(false);
    try {
      setItems(await db.listMyChallenges(token));
    } catch (e) {
      if (e instanceof UnauthorizedError) expire();
      else setFailed(true);
    }
  }, [token, expire]);

  useEffect(() => {
    void load();
  }, [load]);

  async function share(c: ChallengeSummary) {
    const link = challengeUrl(c.code);
    const text = shareText(getStyle(c.code), c.questionCount);
    const r = await nativeShare({ title: 'Prove it', text, url: link });
    if (r === 'unsupported') await copy(`${text}\n${link}`, `share-${c.code}`);
  }

  async function remove(c: ChallengeSummary) {
    if (!token) return;
    const label = c.title || `${c.creatorName}'s challenge`;
    if (!window.confirm(`Delete "${label}"? Its link and all scores will be gone for good.`)) return;
    try {
      await db.deleteChallenge(c.code, token);
    } catch (e) {
      if (e instanceof UnauthorizedError) return expire();
    }
    setItems((list) => (list ? list.filter((x) => x.code !== c.code) : list));
  }

  if (failed)
    return (
      <Shell>
        <ErrorScreen onRetry={load} />
      </Shell>
    );
  if (!items)
    return (
      <Shell>
        <Loading />
      </Shell>
    );

  if (items.length === 0)
    return (
      <Shell>
        <StateScreen emoji="🫙" title="You haven't made a challenge yet." body="Make one and send it to people who think they know you.">
          <Link to="/create" className="btn btn-primary">
            Make One <IconArrowRight />
          </Link>
          <button type="button" className="btn btn-quiet text-[15px] text-mute" onClick={() => signOut()}>
            Log out of @{username}
          </button>
        </StateScreen>
      </Shell>
    );

  return (
    <Shell wide>
      <div className="animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[36px] font-extrabold leading-[1.02] sm:text-5xl">My Challenges</h1>
            <p className="mt-2 truncate text-mute">
              @{username} · {items.length} {plural(items.length, 'challenge', 'challenges')}
            </p>
          </div>
          <Link to="/create" className="btn btn-primary btn-sm w-full sm:w-auto">
            <IconPlus /> New challenge
          </Link>
        </div>

        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c, i) => {
            const link = challengeUrl(c.code);
            const heading = c.title || `${c.creatorName}'s challenge`;
            return (
              <li
                key={c.code}
                className="card flex animate-fade-up flex-col p-5"
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 break-words text-[22px] font-extrabold leading-tight">{heading}</h2>
                  {c.closed && <span className="chip shrink-0 !py-1 text-xs">Closed</span>}
                </div>
                <p className="mt-1 text-sm text-mute">Made {formatDate(c.createdAt)}</p>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-paper px-1 py-2.5">
                    <dd className="font-display text-xl font-extrabold tabular-nums">{c.questionCount}</dd>
                    <dt className="text-xs font-semibold text-mute">{plural(c.questionCount, 'question', 'questions')}</dt>
                  </div>
                  <div className="rounded-2xl bg-paper px-1 py-2.5">
                    <dd className="font-display text-xl font-extrabold tabular-nums">{c.people}</dd>
                    <dt className="text-xs font-semibold text-mute">{plural(c.people, 'person played', 'people played')}</dt>
                  </div>
                  <div className="rounded-2xl bg-paper px-1 py-2.5">
                    <dd className="font-display text-xl font-extrabold tabular-nums">
                      {c.attempts ? `${c.average}/${c.questionCount}` : '-'}
                    </dd>
                    <dt className="text-xs font-semibold text-mute">average</dt>
                  </div>
                </dl>

                <Link to={resultsPath(c.code)} className="btn btn-primary mt-4 w-full">
                  View Leaderboard <IconArrowRight />
                </Link>

                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm !px-2 text-[15px]"
                    onClick={() => copy(link, `link-${c.code}`)}
                    aria-label={`Copy link for ${heading}`}
                  >
                    {copied === `link-${c.code}` ? <IconCheck /> : <IconCopy />}
                    {copied === `link-${c.code}` ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm !px-2 text-[15px]"
                    onClick={() => share(c)}
                    aria-label={`Share ${heading}`}
                  >
                    {copied === `share-${c.code}` ? <IconCheck /> : <IconShare />}
                    {copied === `share-${c.code}` ? 'Copied' : 'Share'}
                  </button>
                  <a
                    className="btn btn-secondary btn-sm !px-2 text-[15px]"
                    href={`/challenge/${c.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${heading} in a new tab`}
                  >
                    <IconEye /> Open
                  </a>
                </div>

                <button
                  type="button"
                  className="btn btn-quiet mt-1 self-start !min-h-[44px] text-[14px] text-mute"
                  onClick={() => remove(c)}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex justify-center">
          <button type="button" className="btn btn-quiet text-[15px] text-mute" onClick={() => signOut()}>
            Log out of @{username}
          </button>
        </div>
      </div>
    </Shell>
  );
}

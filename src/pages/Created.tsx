import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import type { PublicChallenge, ShareStyle } from '../lib/types';
import { getStyle, setStyle as saveStyle } from '../lib/storage';
import { useAuth } from '../lib/auth';
import {
  STYLES,
  challengeUrl,
  igText,
  nativeShare,
  resultsPath,
  shareText,
  whatsappUrl,
} from '../lib/share';
import { useCopy, useDocumentTitle } from '../lib/hooks';
import { cx } from '../lib/utils';
import { Shell } from '../components/Shell';
import { ErrorScreen, Loading, NotFoundChallenge } from '../components/States';
import { IconArrowRight, IconCheck, IconCopy, IconInstagram, IconShare, IconWhatsapp } from '../components/icons';

export default function Created() {
  const { code = '' } = useParams<{ code: string }>();
  const auth = useAuth();
  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [style, setStyle] = useState<ShareStyle>(getStyle(code));
  const { copied, copy } = useCopy();

  useDocumentTitle('Your challenge is ready');

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const c = await db.getChallenge(code);
      if (!c) return setPhase('notfound');
      setChallenge(c);
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  if (phase === 'loading')
    return (
      <Shell>
        <Loading />
      </Shell>
    );
  if (phase === 'notfound')
    return (
      <Shell>
        <NotFoundChallenge />
      </Shell>
    );
  if (phase === 'error' || !challenge)
    return (
      <Shell>
        <ErrorScreen onRetry={load} />
      </Shell>
    );

  const count = challenge.questions.length;
  const link = challengeUrl(code);
  const text = shareText(style, count);
  const igCaption = `${igText(style, count)}\n${link}`;

  async function onShare() {
    const r = await nativeShare({ title: 'Prove it', text, url: link });
    if (r === 'unsupported') await copy(`${text}\n${link}`, 'message');
  }
  function pickStyle(s: ShareStyle) {
    setStyle(s);
    saveStyle(code, s);
  }

  return (
    <Shell>
      <div className="animate-fade-up">
        <span className="block text-5xl" aria-hidden="true">
          🎉
        </span>
        <h1 className="mt-3 text-[38px] font-extrabold leading-[1.02]">Your challenge is ready.</h1>
        <p className="mt-3 text-lg text-mute">Pick a vibe, then send it to the people who think they know you.</p>

        <div role="radiogroup" aria-label="Message style" className="mt-6 grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={style === s.id}
              onClick={() => pickStyle(s.id)}
              className={cx(
                'flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border-2 px-2 text-[15px] font-bold transition',
                style === s.id ? 'border-ink bg-lime shadow-pop-sm' : 'border-ink/15 bg-white hover:border-ink/40',
              )}
            >
              <span aria-hidden="true">{s.emoji}</span> {s.label}
            </button>
          ))}
        </div>

        <figure className="mt-4">
          <figcaption className="sr-only">Message preview</figcaption>
          <div className="rounded-3xl rounded-bl-md border-2 border-ink/10 bg-white px-5 py-4 text-[17px] leading-relaxed">
            <p className="whitespace-pre-line">{text}</p>
            <p className="mt-2 break-all font-semibold text-ink underline underline-offset-2">{link}</p>
          </div>
        </figure>

        <div className="mt-5 flex flex-col gap-3">
          <button type="button" className="btn btn-primary w-full" onClick={() => copy(link, 'link')}>
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

          <div className="grid grid-cols-3 gap-3">
            <button type="button" className="btn btn-secondary btn-sm flex-col !gap-1 !py-2 text-[15px]" onClick={onShare}>
              {copied === 'message' ? <IconCheck /> : <IconShare />}
              {copied === 'message' ? 'Copied' : 'Share'}
            </button>
            <a
              className="btn btn-secondary btn-sm flex-col !gap-1 !py-2 text-[15px]"
              href={whatsappUrl(text, link)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconWhatsapp />
              WhatsApp
            </a>
            <button
              type="button"
              className="btn btn-secondary btn-sm flex-col !gap-1 !py-2 text-[15px]"
              onClick={() => copy(igCaption, 'ig')}
            >
              {copied === 'ig' ? <IconCheck /> : <IconInstagram />}
              {copied === 'ig' ? 'Copied' : 'Instagram'}
            </button>
          </div>
          <p className="min-h-[1.25rem] text-center text-sm text-mute" role="status">
            {copied === 'ig'
              ? 'Caption + link copied. Paste it in a DM, or add the link as a story sticker.'
              : 'Instagram copies a short caption with the link, ready to paste.'}
          </p>
        </div>

        {auth.status === 'in' && (
          <div className="mt-6 rounded-3xl border-2 border-ink bg-white p-5 shadow-soft">
            <h2 className="text-[22px] font-extrabold leading-tight">Who actually knows you?</h2>
            <p className="mt-1 text-mute">Scores show up here as people play.</p>
            <Link to={resultsPath(code)} className="btn btn-primary mt-4 w-full">
              See the leaderboard <IconArrowRight />
            </Link>
            <Link to="/my" className="btn btn-quiet mt-1 w-full text-[15px]">
              All my challenges
            </Link>
            <p className="text-center text-xs text-mute">
              Lost this link later? Log in from the homepage and it'll be in My Challenges.
            </p>
          </div>
        )}

        {db.mode === 'local' && (
          <p className="mt-5 rounded-2xl bg-lime-soft px-4 py-3 text-[15px] leading-snug">
            <strong>Demo mode:</strong> this challenge is saved in this browser only, so the link won't open on a friend's
            phone yet. Connect Supabase (see the README) to share it for real.
          </p>
        )}
      </div>
    </Shell>
  );
}

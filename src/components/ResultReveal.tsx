import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AttemptResult } from '../lib/types';
import { LEVELS, claimNote, headlineFor, pctOf, percentileLine, tierFor } from '../lib/tiers';
import { challengeUrl, nativeShare, scoreShareText } from '../lib/share';
import { prefersReducedMotion, useCopy } from '../lib/hooks';
import { cx } from '../lib/utils';
import { IconArrowRight, IconCheck, IconShare, IconX } from './icons';

interface Props {
  code: string;
  creatorName: string;
  level: number;
  result: AttemptResult;
  onRetry: () => void;
}

function CountUp({ to, instant }: { to: number; instant: boolean }) {
  const [v, setV] = useState(instant ? to : 0);
  useEffect(() => {
    if (instant || to === 0) {
      setV(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = Math.min(1100, 260 * to + 300);
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, instant]);
  return <>{v}</>;
}

export function ResultReveal({ code, creatorName, level, result, onRetry }: Props) {
  const reduce = prefersReducedMotion();
  const [stage, setStage] = useState(reduce ? 3 : 0);
  const { copied, copy } = useCopy();

  // 0: "You said you knew X..."  1: score  2: verdict  3: everything else
  useEffect(() => {
    if (stage >= 3) return;
    const delays = [1500, 1500, 900];
    const t = window.setTimeout(() => setStage((s) => s + 1), delays[stage]);
    return () => window.clearTimeout(t);
  }, [stage]);

  const pct = pctOf(result.score, result.total);
  const tier = tierFor(pct);
  const headline = headlineFor(tier, creatorName, result.score);
  const claim = claimNote(level, pct);
  const lvl = LEVELS[level] ?? LEVELS[0];

  async function shareScore() {
    const text = scoreShareText(creatorName, result.score, result.total, tier.emoji);
    const url = challengeUrl(code);
    const r = await nativeShare({ title: 'Prove it', text, url });
    if (r === 'unsupported') await copy(`${text}\n${url}`, 'score');
  }

  return (
    <section
      className="flex flex-1 flex-col pb-2"
      aria-live="polite"
      onClick={() => stage < 3 && setStage(3)}
    >
      {stage < 3 && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="animate-fade-up">
            <p className="font-display text-[28px] font-bold leading-tight">
              You said you knew <span className="marker">{creatorName}</span>...
            </p>
            <p className="chip mt-4">
              <span aria-hidden="true">{lvl.emoji}</span> {lvl.label}
            </p>
          </div>

          {stage >= 1 && (
            <div className="mt-10 animate-pop" aria-hidden="true">
              <div className="font-display text-[110px] font-extrabold leading-none tabular-nums">
                <CountUp to={result.score} instant={reduce} />
                <span className="text-ink/25"> / {result.total}</span>
              </div>
            </div>
          )}

          {stage >= 2 && (
            <p className="mt-6 animate-fade-up font-display text-3xl font-extrabold leading-tight">{headline}</p>
          )}

          <button type="button" className="btn btn-quiet mt-10 text-base" onClick={() => setStage(3)}>
            Skip
          </button>
        </div>
      )}

      {stage >= 3 && (
        <div className="animate-fade-up">
          <div className="pt-4 text-center">
            <p className="text-[15px] font-semibold text-mute">
              You said you knew {creatorName}... <span aria-hidden="true">{lvl.emoji}</span>
            </p>
            <h1 className="mt-2 font-display text-[88px] font-extrabold leading-none tabular-nums">
              <span className="sr-only">
                You scored {result.score} out of {result.total}.
              </span>
              <span aria-hidden="true">
                {result.score}
                <span className="text-ink/25"> / {result.total}</span>
              </span>
            </h1>
            <p className="chip mt-4 border-ink bg-lime">
              <span aria-hidden="true">{tier.emoji}</span> {tier.label}
            </p>
            <h2 className="mt-4 text-[28px] font-extrabold leading-tight">{headline}</h2>
            <p className="mt-1 text-lg text-mute">{tier.line}</p>
          </div>

          <p className="card mt-6 px-5 py-4 text-center text-[17px] font-semibold">{percentileLine(result)}</p>

          {claim && (
            <p className="mt-3 rounded-3xl bg-ink px-5 py-4 text-center text-paper">
              <span className="block font-semibold text-paper/70">{claim.lead}</span>
              <span className="block text-lg font-bold">{claim.tail}</span>
            </p>
          )}

          <ol className="mt-5 flex justify-center gap-1.5" aria-label="Your answers">
            {result.flags.map((ok, i) => (
              <li
                key={i}
                className={cx(
                  'grid h-8 max-w-[40px] flex-1 place-items-center rounded-lg border-2',
                  ok ? 'border-ink bg-lime' : 'border-coral-deep bg-coral-soft text-coral-deep',
                )}
              >
                {ok ? <IconCheck className="h-3.5 w-3.5" /> : <IconX className="h-3.5 w-3.5" />}
                <span className="sr-only">
                  Question {i + 1}: {ok ? 'right' : 'wrong'}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-3xl border-2 border-ink bg-white p-5 text-center shadow-soft">
            <h3 className="text-[26px] font-extrabold leading-tight">Think your friends know YOU?</h3>
            <p className="mt-1 text-mute">Make your own in about two minutes.</p>
            <Link to="/create?chooseAccount=1" className="btn btn-primary mt-4 w-full">
              Make My Challenge <IconArrowRight />
            </Link>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={shareScore}>
              {copied === 'score' ? (
                <>
                  <IconCheck /> Copied
                </>
              ) : (
                <>
                  <IconShare /> Share my score
                </>
              )}
            </button>
            <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

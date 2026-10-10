import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/db';
import { ChallengeClosedError, LIMITS, type AttemptResult, type PublicChallenge } from '../lib/types';
import { LEVELS } from '../lib/tiers';
import { getSavedName, getSessionId, saveName } from '../lib/storage';
import { useAuth } from '../lib/auth';
import { resultsPath } from '../lib/share';
import { useDocumentTitle } from '../lib/hooks';
import { cx, plural } from '../lib/utils';
import { Shell } from '../components/Shell';
import { Quiz } from '../components/Quiz';
import { ResultReveal } from '../components/ResultReveal';
import { ErrorScreen, GoHome, Loading, NotFoundChallenge, StateScreen } from '../components/States';
import { IconArrowRight } from '../components/icons';

type Phase = 'loading' | 'notfound' | 'error' | 'closed' | 'landing' | 'quiz' | 'submitting' | 'submit-error' | 'result';

export default function Challenge() {
  const { code = '' } = useParams<{ code: string }>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [name, setName] = useState(getSavedName());
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [round, setRound] = useState(0);
  const auth = useAuth();
  const [owned, setOwned] = useState(false);

  useDocumentTitle(challenge ? `How well do you know ${challenge.creatorName}?` : 'Prove it');

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const c = await db.getChallenge(code);
      if (!c) return setPhase('notfound');
      setChallenge(c);
      setPhase(c.closed ? 'closed' : 'landing');
    } catch {
      setPhase('error');
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  // If the person looking at this link is its creator, offer a shortcut to the leaderboard.
  useEffect(() => {
    if (auth.status !== 'in' || !auth.token) return;
    let alive = true;
    db.listMyChallenges(auth.token)
      .then((list) => alive && setOwned(list.some((c) => c.code === code)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [auth.status, auth.token, code]);

  async function submit(a: number[]) {
    setAnswers(a);
    setPhase('submitting');
    try {
      const r = await db.submitAttempt({
        code,
        sessionId: getSessionId(),
        name: name.trim(),
        level: level ?? 0,
        answers: a,
      });
      setResult(r);
      setPhase('result');
    } catch (e) {
      setPhase(e instanceof ChallengeClosedError ? 'closed' : 'submit-error');
    }
  }

  function start() {
    saveName(name.trim());
    setAnswers([]);
    setResult(null);
    setRound((r) => r + 1);
    setPhase('quiz');
  }

  if (phase === 'loading') {
    return (
      <Shell>
        <Loading />
      </Shell>
    );
  }
  if (phase === 'notfound') {
    return (
      <Shell>
        <NotFoundChallenge />
      </Shell>
    );
  }
  if (phase === 'error') {
    return (
      <Shell>
        <ErrorScreen onRetry={load} />
      </Shell>
    );
  }
  if (phase === 'closed') {
    return (
      <Shell>
        <StateScreen
          emoji="🔒"
          title="This challenge has ended."
          body={challenge ? `${challenge.creatorName} closed it. Make your own and see who actually knows you.` : undefined}
        >
          <Link to="/create?chooseAccount=1" className="btn btn-primary">
            Make My Challenge
          </Link>
          <GoHome />
        </StateScreen>
      </Shell>
    );
  }
  if (!challenge) return null;

  if (phase === 'quiz') {
    return (
      <Shell hideHeader>
        <Quiz key={round} questions={challenge.questions} onComplete={submit} />
      </Shell>
    );
  }
  if (phase === 'submitting') {
    return (
      <Shell hideHeader>
        <Loading label="Locking it in..." />
      </Shell>
    );
  }
  if (phase === 'submit-error') {
    return (
      <Shell>
        <StateScreen emoji="📡" title="Your answers didn't send." body="Nothing's lost. Give it another go.">
          <button type="button" className="btn btn-primary" onClick={() => submit(answers)}>
            Try again
          </button>
          <GoHome />
        </StateScreen>
      </Shell>
    );
  }
  if (phase === 'result' && result) {
    return (
      <Shell hideHeader>
        <ResultReveal
          key={round}
          code={code}
          creatorName={challenge.creatorName}
          level={level ?? 0}
          result={result}
          onRetry={() => {
            setLevel(null);
            setPhase('landing');
          }}
        />
      </Shell>
    );
  }

  /* ---------------- landing ---------------- */
  const canStart = level !== null && name.trim().length > 0;
  const n = challenge.questions.length;
  const played = challenge.attemptCount;

  return (
    <Shell>
      <div className="animate-fade-up">
        {owned && (
          <Link
            to={resultsPath(code)}
            className="mb-4 flex items-center justify-between rounded-2xl bg-lime-soft px-4 py-3 text-[15px] font-semibold"
          >
            This is your challenge. See who's played
            <IconArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        )}

        <span className="block text-5xl" aria-hidden="true">
          👀
        </span>
        <h1 className="mt-3 break-words text-[38px] font-extrabold leading-[1.02] sm:text-[48px]">
          How well do you know <span className="marker">{challenge.creatorName}</span>?
        </h1>
        <p className="mt-3 text-lg text-mute">
          You think you know them.
          <br />
          Let's find out.
        </p>
        <p className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="chip">
            {n} {plural(n, 'question', 'questions')}
          </span>
          <span className="chip">
            {played > 0 ? `${played} ${plural(played, 'person has', 'people have')} tried` : 'Nobody has tried yet'}
          </span>
        </p>

        <h2 className="mt-8 text-[22px] font-extrabold leading-tight">How would you describe your connection?</h2>
        <p className="mt-1 text-[15px] text-mute">Just for fun. But we're keeping score.</p>

        <div role="radiogroup" aria-label="Your connection" className="mt-3 flex flex-col gap-2.5">
          {LEVELS.map((l) => {
            const on = level === l.id;
            return (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setLevel(l.id)}
                className={cx(
                  'flex min-h-[62px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-left transition duration-150 active:translate-y-[2px]',
                  on ? 'border-ink bg-lime shadow-pop' : 'border-ink/15 bg-white hover:border-ink/40',
                )}
              >
                <span className="text-[26px]" aria-hidden="true">
                  {l.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[18px] font-bold leading-tight">{l.label}</span>
                  <span className="block text-[15px] leading-snug text-ink/70">"{l.blurb}"</span>
                </span>
                <span
                  aria-hidden="true"
                  className={cx(
                    'h-5 w-5 shrink-0 rounded-full border-2',
                    on ? 'border-ink bg-ink shadow-[inset_0_0_0_3px_#C6F432]' : 'border-ink/25',
                  )}
                />
              </button>
            );
          })}
        </div>

        {level !== null && (
          <p role="status" className="mt-3 animate-fade-up rounded-2xl bg-ink px-4 py-3 text-[17px] font-semibold text-paper">
            {LEVELS[level].commit}
          </p>
        )}

        <label className="mt-6 block">
          <span className="text-[15px] font-bold">Your name</span>
          <span className="block text-sm text-mute">So {challenge.creatorName} knows who's who.</span>
          <input
            className="input mt-2"
            value={name}
            maxLength={LIMITS.maxName}
            placeholder="Name or nickname"
            autoComplete="given-name"
            enterKeyHint="go"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canStart) start();
            }}
          />
        </label>

        <button type="button" className="btn btn-primary mt-5 w-full" disabled={!canStart} onClick={start}>
          Start Challenge <IconArrowRight />
        </button>
        {!canStart && (
          <p className="mt-2 text-center text-sm text-mute">
            {level === null ? 'Pick how well you know them to start.' : 'Add your name to start.'}
          </p>
        )}
      </div>
    </Shell>
  );
}

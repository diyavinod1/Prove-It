import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../lib/db';
import { LIMITS, UnauthorizedError, type DraftQuestion } from '../lib/types';
import { SUGGESTIONS, STARTER_PACK } from '../lib/suggestions';
import { questionIssue } from '../lib/validate';
import { clearDraft, getSavedName, loadDraft, saveDraft, saveName } from '../lib/storage';
import { useAuth } from '../lib/auth';
import { cx, plural, uid } from '../lib/utils';
import { Shell } from '../components/Shell';
import { Sheet } from '../components/Sheet';
import { Quiz } from '../components/Quiz';
import { QuestionEditor } from '../components/QuestionEditor';
import { CreatorSetup } from '../components/CreatorSetup';
import { Loading } from '../components/States';
import { IconArrowRight, IconDown, IconEdit, IconEye, IconPlus, IconTrash, IconUp } from '../components/icons';

export default function Create() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const chooseAccount = searchParams.get('chooseAccount') === '1';
  const initial = useMemo(() => loadDraft(), []);
  const [name, setName] = useState(initial?.name || getSavedName());
  const [title, setTitle] = useState(initial?.title ?? '');
  const [step, setStep] = useState<'name' | 'build'>(initial?.name ? 'build' : 'name');
  const [questions, setQuestions] = useState<DraftQuestion[]>(initial?.questions ?? []);
  const [editing, setEditing] = useState<DraftQuestion | 'new' | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewDone, setPreviewDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (step === 'build' && !finished.current) saveDraft({ name, title, questions });
  }, [step, name, title, questions]);

  /* ---------------- step 0: creator setup (first time only) ---------------- */
  if (auth.status === 'loading') {
    return (
      <Shell>
        <Loading />
      </Shell>
    );
  }
  if (auth.status === 'out') {
    return (
      <Shell>
        <CreatorSetup />
      </Shell>
    );
  }

  // After a participant finishes someone else's challenge, let them choose which creator
  // account to use instead of silently creating under the account already signed in here.
  if (chooseAccount && auth.status === 'in') {
    async function useDifferentAccount() {
      if (switchingAccount) return;
      setSwitchingAccount(true);
      await auth.signOut();
      nav('/login?next=%2Fcreate', { replace: true });
    }

    return (
      <Shell>
        <div className="animate-fade-up pt-4">
          <span className="block text-5xl" aria-hidden="true">👀</span>
          <h1 className="mt-3 text-[38px] font-extrabold leading-[1.02]">Ready to make yours?</h1>
          <p className="mt-3 text-lg text-mute">Choose which account should own your new challenge.</p>
          <div className="card mt-7 p-5">
            <p className="text-sm font-semibold text-mute">Currently signed in as</p>
            <p className="mt-1 break-all text-2xl font-extrabold">@{auth.username}</p>
            <button
              type="button"
              className="btn btn-primary mt-5 w-full"
              onClick={() => nav('/create', { replace: true })}
            >
              Continue as @{auth.username} <IconArrowRight />
            </button>
          </div>
          <div className="mt-4 rounded-3xl border-2 border-ink/15 bg-white p-5">
            <h2 className="text-xl font-extrabold">Someone else taking the challenge?</h2>
            <p className="mt-1 text-mute">Switch accounts or create a new one so the challenge belongs to you.</p>
            <button
              type="button"
              className="btn btn-secondary mt-4 w-full"
              onClick={useDifferentAccount}
              disabled={switchingAccount}
            >
              {switchingAccount ? 'Switching account…' : 'Use a different account'} <IconArrowRight />
            </button>
          </div>
          <p className="mt-5 text-center text-sm text-mute">
            Just want to check your existing scores? <Link to="/my" className="font-bold text-ink underline underline-offset-4">My Challenges</Link>
          </p>
        </div>
      </Shell>
    );
  }

  /* ---------------- step 1: name ---------------- */
  if (step === 'name') {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      saveName(name.trim());
      setStep('build');
    };
    return (
      <Shell>
        <form onSubmit={submit} className="animate-fade-up pt-4">
          <span className="block text-5xl" aria-hidden="true">
            ✍️
          </span>
          <h1 className="mt-3 text-[38px] font-extrabold leading-[1.02]">Let's make your challenge.</h1>
          <p className="mt-3 text-lg text-mute">What should your friends call you?</p>
          <label className="mt-6 block">
            <span className="sr-only">Your name or nickname</span>
            <input
              className="input"
              value={name}
              maxLength={LIMITS.maxName}
              placeholder="Name or nickname"
              autoComplete="given-name"
              enterKeyHint="next"
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="mt-4 block">
            <span className="text-[15px] font-bold">
              Name this challenge <span className="font-medium text-mute">· optional</span>
            </span>
            <input
              className="input mt-1.5"
              value={title}
              maxLength={60}
              placeholder="How well do you know me?"
              enterKeyHint="next"
              onChange={(e) => setTitle(e.target.value)}
            />
            <span className="mt-1.5 block text-sm text-mute">Only you see this. It helps you tell your challenges apart.</span>
          </label>
          <button type="submit" className="btn btn-primary mt-5 w-full" disabled={!name.trim()}>
            Continue <IconArrowRight />
          </button>
          <p className="mt-4 text-center text-sm text-mute">Takes about 2 minutes.</p>
        </form>
      </Shell>
    );
  }

  /* ---------------- step 2: build ---------------- */
  const n = questions.length;
  const incomplete = questions.filter((q) => questionIssue(q)).length;
  const ready = n >= LIMITS.minQuestions && incomplete === 0;
  const valid = questions.filter((q) => !questionIssue(q));
  const denominator = Math.max(LIMITS.targetQuestions, n);

  let blocker: string | null = null;
  if (n < LIMITS.minQuestions) {
    const need = LIMITS.minQuestions - n;
    blocker = `Add ${need} more ${plural(need, 'question', 'questions')} to continue`;
  } else if (incomplete > 0) {
    blocker = `${incomplete} ${plural(incomplete, 'question still needs', 'questions still need')} an answer`;
  }

  let hint = 'Aim for 8. That is the sweet spot.';
  if (n >= LIMITS.maxQuestions) hint = "That's the max. Nice.";
  else if (n >= LIMITS.targetQuestions) hint = 'Looking good.';
  else if (n >= LIMITS.minQuestions) hint = 'Good to go. 8 is the sweet spot.';

  function saveQuestion(q: DraftQuestion) {
    setQuestions((list) => {
      const i = list.findIndex((x) => x.id === q.id);
      if (i === -1) return [...list, q];
      return list.map((x) => (x.id === q.id ? q : x));
    });
    setEditing(null);
  }
  function move(i: number, dir: -1 | 1) {
    setQuestions((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function remove(i: number) {
    setQuestions((list) => list.filter((_, j) => j !== i));
  }
  function starterPack() {
    setQuestions(
      STARTER_PACK.map((idx) => ({
        id: uid(),
        prompt: SUGGESTIONS[idx].prompt,
        options: [...SUGGESTIONS[idx].options],
        correctIndex: -1,
      })),
    );
  }
  function startOver() {
    if (!window.confirm('Clear everything and start over?')) return;
    clearDraft();
    setQuestions([]);
    setStep('name');
  }

  async function create() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!auth.token) throw new UnauthorizedError();
      const out = await db.createChallenge(auth.token, {
        creatorName: name.trim(),
        title: title.trim() || null,
        questions: questions.map(({ prompt, options, correctIndex }) => ({
          prompt: prompt.trim(),
          options: options.map((o) => o.trim()),
          correctIndex,
        })),
      });
      finished.current = true;
      clearDraft();
      nav(`/created/${out.code}`, { replace: true });
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        auth.expire();
        return;
      }
      setError("Couldn't create your challenge. Check your connection and try again.");
      setBusy(false);
    }
  }

  /* preview overlay */
  if (previewing) {
    return (
      <div className="fixed inset-0 z-40 overflow-y-auto bg-paper">
        <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col px-5 pb-6 pt-[max(0.5rem,env(safe-area-inset-top))] md:max-w-[600px] md:px-8">
          <p className="mt-2 rounded-xl bg-lime-soft px-4 py-2 text-center text-sm font-bold">
            Preview. This is what your friends will see.
          </p>
          {previewDone ? (
            <div className="flex flex-1 animate-fade-up flex-col items-center justify-center text-center">
              <div className="text-6xl" aria-hidden="true">
                🎬
              </div>
              <h2 className="mt-4 text-3xl font-extrabold">That's the whole thing.</h2>
              <p className="mt-2 max-w-xs text-lg text-mute">They'll pick their answers, then get a score and a verdict.</p>
              <button
                type="button"
                className="btn btn-primary mt-8 w-full max-w-xs"
                onClick={() => {
                  setPreviewing(false);
                  setPreviewDone(false);
                }}
              >
                Back to editing
              </button>
            </div>
          ) : (
            <Quiz
              questions={valid.map(({ id, prompt, options }) => ({ id, prompt, options }))}
              onComplete={() => setPreviewDone(true)}
              onExit={() => setPreviewing(false)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <Shell>
      <div className="flex flex-1 flex-col animate-fade-up">
        <h1 className="text-[32px] font-extrabold leading-[1.05]">
          Okay {name.trim()}. What should they know about you?
        </h1>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-2xl font-bold tabular-nums" aria-live="polite">
              {n} / {denominator} <span className="text-lg font-semibold text-mute">questions</span>
            </p>
          </div>
          <div
            className="mt-2 h-3 overflow-hidden rounded-full bg-ink/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={denominator}
            aria-valuenow={n}
            aria-label="Questions added"
          >
            <div
              className="h-full rounded-full border-2 border-ink bg-lime transition-[width] duration-500"
              style={{ width: `${Math.min(100, (n / denominator) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-sm text-mute">{hint}</p>
        </div>

        {n === 0 ? (
          <div className="card mt-6 p-5 text-center">
            <p className="text-lg font-bold">Start with questions only your people could get.</p>
            <div className="mt-4 flex flex-col gap-3">
              <button type="button" className="btn btn-primary" onClick={starterPack}>
                Start with 8 ideas
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing('new')}>
                Write my own
              </button>
            </div>
            <p className="mt-3 text-sm text-mute">Ideas come with options. You just tap the right answers.</p>
          </div>
        ) : (
          <ol className="mt-6 flex flex-col gap-3">
            {questions.map((q, i) => {
              const issue = questionIssue(q);
              return (
                <li key={q.id} className="card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEditing(q)}
                    aria-label={`Edit question ${i + 1}: ${q.prompt}`}
                    className="flex w-full items-start gap-3 px-4 pb-1 pt-3.5 text-left hover:bg-paper/60"
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink font-display text-sm font-bold text-lime">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-bold leading-snug">{q.prompt || 'Untitled question'}</span>
                      <span
                        className={cx(
                          'mt-0.5 block break-words text-[15px] font-semibold',
                          issue ? 'text-coral-deep' : 'text-mute',
                        )}
                      >
                        {issue ? `${issue} →` : `✓ ${q.options[q.correctIndex]}`}
                      </span>
                    </span>
                  </button>
                  <div className="flex justify-end gap-0.5 px-2 pb-1.5">
                    {[
                      { label: 'Move up', icon: <IconUp />, off: i === 0, act: () => move(i, -1) },
                      { label: 'Move down', icon: <IconDown />, off: i === n - 1, act: () => move(i, 1) },
                      { label: 'Edit', icon: <IconEdit />, off: false, act: () => setEditing(q) },
                      { label: 'Delete', icon: <IconTrash />, off: false, act: () => remove(i) },
                    ].map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        disabled={b.off}
                        onClick={b.act}
                        aria-label={`${b.label} question ${i + 1}`}
                        className="grid h-11 w-11 place-items-center rounded-full text-mute hover:bg-ink/5 hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent"
                      >
                        {b.icon}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {n > 0 && n < LIMITS.maxQuestions && (
          <button type="button" className="btn btn-secondary mt-3 w-full border-dashed" onClick={() => setEditing('new')}>
            <IconPlus /> Add a question
          </button>
        )}

        {n > 0 && (
          <button type="button" className="btn btn-quiet mt-2 self-center text-[15px] text-mute" onClick={startOver}>
            Start over
          </button>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-coral-soft px-4 py-3 font-semibold text-coral-deep">
            {error}
          </p>
        )}

        <div className="sticky bottom-0 -mx-5 mt-auto border-t-2 border-ink/10 bg-paper/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:-mx-8 md:px-8">
          {blocker && n > 0 && <p className="mb-2 text-center text-sm font-semibold text-mute">{blocker}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-secondary px-4"
              disabled={valid.length === 0}
              onClick={() => setPreviewing(true)}
              aria-label="Preview challenge"
            >
              <IconEye />
              <span className="hidden min-[380px]:inline">Preview</span>
            </button>
            <button type="button" className="btn btn-primary flex-1" disabled={!ready || busy} onClick={create}>
              {busy ? 'Creating...' : 'Create challenge'} {!busy && <IconArrowRight />}
            </button>
          </div>
        </div>
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} label="Question editor">
        {editing !== null && (
          <QuestionEditor
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            usedPrompts={questions.map((q) => q.prompt)}
            onSave={saveQuestion}
            onClose={() => setEditing(null)}
          />
        )}
      </Sheet>
    </Shell>
  );
}

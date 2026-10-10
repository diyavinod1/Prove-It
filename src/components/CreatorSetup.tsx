import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { useAuth } from '../lib/auth';
import { MAX_ANSWER, MIN_ANSWER, PERSONAL_QUESTIONS, normalizeAnswer, usernameIssue } from '../lib/security';
import { UsernameTakenError } from '../lib/types';
import { IconArrowRight, IconDown } from './icons';

/** First-time creator: pick a username and a personal check. No email, no traditional sign-up. */
export function CreatorSetup() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [question, setQuestion] = useState(PERSONAL_QUESTIONS[0]);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; answer?: string; form?: string }>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: typeof errors = {};
    const uIssue = usernameIssue(username);
    if (uIssue) next.username = uIssue;
    const n = normalizeAnswer(answer).length;
    if (n < MIN_ANSWER) next.answer = 'Add an answer you will remember.';
    else if (n > MAX_ANSWER) next.answer = 'Keep it a bit shorter.';
    setErrors(next);
    if (next.username || next.answer) return;

    setBusy(true);
    try {
      const res = await db.registerCreator(username.trim(), question, answer);
      signIn(res); // the page flips straight into the challenge flow, no second login
    } catch (err) {
      if (err instanceof UsernameTakenError) setErrors({ username: 'That username is already taken.' });
      else {
        const message = err instanceof Error ? err.message : '';
        setErrors({ form: message ? `Couldn't set that up: ${message}` : "Couldn't set that up. Check your Supabase setup and try again." });
      }
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="animate-fade-up pt-2">
      <span className="block text-5xl" aria-hidden="true">
        👀
      </span>
      <h1 className="mt-3 text-[38px] font-extrabold leading-[1.02]">Before we start</h1>
      <p className="mt-3 text-lg text-mute">Pick a name and a personal check, so you can always find your challenges again.</p>

      <label className="mt-7 block">
        <span className="text-[17px] font-bold">Pick a username</span>
        <input
          className="input mt-2"
          value={username}
          maxLength={24}
          placeholder="yourname123"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="next"
          aria-invalid={!!errors.username}
          aria-describedby="u-help"
          onChange={(e) => {
            setUsername(e.target.value);
            setErrors((x) => ({ ...x, username: undefined }));
          }}
        />
        <span
          id="u-help"
          role={errors.username ? 'alert' : undefined}
          className={`mt-1.5 block text-sm ${errors.username ? 'font-bold text-coral-deep' : 'text-mute'}`}
        >
          {errors.username ?? 'Letters, numbers and underscores. Not case sensitive.'}
        </span>
      </label>

      <fieldset className="mt-6">
        <legend className="text-[17px] font-bold">Set your personal check</legend>

        <label className="mt-2 block">
          <span className="text-[15px] font-semibold text-mute">Question</span>
          <span className="relative mt-1.5 block">
            <select
              className="input appearance-none pr-12"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            >
              {PERSONAL_QUESTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            <IconDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" />
          </span>
        </label>

        <label className="mt-3 block">
          <span className="text-[15px] font-semibold text-mute">Your answer</span>
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
            aria-invalid={!!errors.answer}
            aria-describedby="a-help"
            onChange={(e) => {
              setAnswer(e.target.value);
              setErrors((x) => ({ ...x, answer: undefined }));
            }}
          />
          <span
            id="a-help"
            role={errors.answer ? 'alert' : undefined}
            className={`mt-1.5 block text-sm ${errors.answer ? 'font-bold text-coral-deep' : 'text-mute'}`}
          >
            {errors.answer ?? "You'll use this to get back to your challenges if you lose your links."}
          </span>
        </label>
      </fieldset>

      {errors.form && (
        <p role="alert" className="mt-4 rounded-xl bg-coral-soft px-4 py-3 font-semibold text-coral-deep">
          {errors.form}
        </p>
      )}

      <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy}>
        {busy ? 'Setting up...' : 'Continue'} {!busy && <IconArrowRight />}
      </button>
      <p className="mt-3 text-center text-sm text-mute">
        Don't worry, this is just for getting back to your challenges later.
      </p>
      <p className="mt-6 text-center text-mute">
        Already have one?{' '}
        <Link to="/login?next=/create" className="font-bold text-ink underline underline-offset-4">
          Welcome back
        </Link>
      </p>
    </form>
  );
}

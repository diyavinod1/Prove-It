import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { IconArrowRight } from '../components/icons';

/** Pull a challenge code out of a pasted link or a bare code. */
function extractCode(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/\/challenge\/([a-z0-9]+)/i);
  if (m) return m[1].toLowerCase();
  return /^[a-z0-9]{4,20}$/i.test(s) ? s.toLowerCase() : null;
}

export default function Take() {
  const nav = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const code = extractCode(value);
    if (!code) return setError(true);
    nav(`/challenge/${code}`);
  }

  return (
    <Shell>
      <form onSubmit={submit} className="animate-fade-up pt-4" noValidate>
        <span className="block text-5xl" aria-hidden="true">
          🎯
        </span>
        <h1 className="mt-3 text-[38px] font-extrabold leading-[1.02]">Got a challenge link?</h1>
        <p className="mt-3 text-lg text-mute">
          Usually you just tap the link someone sent you. If you only have it copied, paste it here.
        </p>

        <label className="mt-6 block">
          <span className="sr-only">Challenge link or code</span>
          <input
            className="input"
            value={value}
            placeholder="Paste a link or code"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={error}
            aria-describedby={error ? 'take-error' : undefined}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
          />
        </label>
        {error && (
          <p id="take-error" role="alert" className="mt-2 font-semibold text-coral-deep">
            That doesn't look like a challenge link. Try pasting it again.
          </p>
        )}

        <button type="submit" className="btn btn-primary mt-4 w-full" disabled={!value.trim()}>
          Open challenge <IconArrowRight />
        </button>

        <p className="mt-8 text-center text-mute">
          Don't have one?{' '}
          <Link to="/create" className="font-bold text-ink underline underline-offset-4">
            Make your own
          </Link>
        </p>
      </form>
    </Shell>
  );
}

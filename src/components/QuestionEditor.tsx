import { useMemo, useState, type FormEvent } from 'react';
import { LIMITS, type DraftQuestion } from '../lib/types';
import { CATEGORIES, SUGGESTIONS, type SuggestionCategory } from '../lib/suggestions';
import { cx, uid } from '../lib/utils';
import { IconCheck, IconPlus, IconX } from './icons';

interface Props {
  /** null = brand new question */
  initial: DraftQuestion | null;
  usedPrompts: string[];
  onSave: (q: DraftQuestion) => void;
  onClose: () => void;
}

export function QuestionEditor({ initial, usedPrompts, onSave, onClose }: Props) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? '');
  const [options, setOptions] = useState<string[]>(() => {
    const o = initial?.options ?? ['', '', '', ''];
    return o.length >= LIMITS.minOptions ? [...o] : [...o, '', ''].slice(0, 2);
  });
  const [correct, setCorrect] = useState(initial?.correctIndex ?? -1);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<'All vibes' | SuggestionCategory>('All vibes');
  const [search, setSearch] = useState('');
  // Existing questions open directly in edit mode; adding a question opens the idea library first.
  const [showLibrary, setShowLibrary] = useState(!initial);
  const [showEditor, setShowEditor] = useState(Boolean(initial));

  const ideas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return SUGGESTIONS.filter((s) => !usedPrompts.includes(s.prompt))
      .filter((s) => category === 'All vibes' || s.category === category)
      .filter((s) => !term || s.prompt.toLowerCase().includes(term) || s.options.some((o) => o.toLowerCase().includes(term)))
      .slice(0, 18);
  }, [usedPrompts, category, search]);


  function setOption(i: number, v: string) {
    setOptions((o) => o.map((x, j) => (j === i ? v : x)));
    setError(null);
  }

  function removeOption(i: number) {
    setOptions((o) => o.filter((_, j) => j !== i));
    setCorrect((c) => (c === i ? -1 : c > i ? c - 1 : c));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const cleaned = options.map((o) => o.trim());
    const filled = cleaned.map((o, i) => ({ o, i })).filter((x) => x.o);
    if (!prompt.trim()) return setError('Write the question first.');
    if (filled.length < 2) return setError('Add at least two options.');
    if (correct < 0) return setError('Tap the ✓ next to the right answer.');
    if (!cleaned[correct]) return setError("The right answer can't be empty.");
    onSave({
      id: initial?.id ?? uid(),
      prompt: prompt.trim(),
      options: filled.map((x) => x.o),
      correctIndex: filled.findIndex((x) => x.i === correct),
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-mute">{initial ? 'Tiny tweak, big reveal' : 'Build your challenge'}</p>
          <h2 className="text-2xl font-extrabold">{initial ? 'Edit question ✏️' : showEditor ? 'Make it yours ✨' : 'Add a question 💭'}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5"
        >
          <IconX />
        </button>
      </div>

      {initial && !showLibrary && (
        <button type="button" className="btn btn-quiet mt-2 !min-h-[40px] self-start !px-0 text-sm" onClick={() => setShowLibrary(true)}>
          <IconPlus className="h-4 w-4" /> Swap for a suggested question
        </button>
      )}

      {showLibrary && (
        <section className="mt-4 rounded-3xl border-2 border-ink/10 bg-[#F8F6F0] p-3.5" aria-label="Question idea library">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-extrabold">Steal a little inspo 👀</p>
              <p className="text-sm text-mute">Pick a vibe, then make it your question.</p>
            </div>
            <span className="shrink-0 rounded-full bg-lime px-2.5 py-1 text-xs font-extrabold text-ink">{SUGGESTIONS.length}+ ideas</span>
          </div>
          <input
            className="input mt-3 !min-h-[46px] !rounded-xl !text-[15px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search music, food, exams…"
            aria-label="Search question ideas"
          />
          <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cx('chip shrink-0 !px-3 !py-1.5 !text-[13px]', category === item ? 'border-ink bg-ink text-white' : 'hover:border-ink/40')}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-1 grid gap-2">
            {ideas.map((idea) => (
              <button
                key={idea.prompt}
                type="button"
                onClick={() => {
                  setPrompt(idea.prompt);
                  setOptions([...idea.options]);
                  setCorrect(-1);
                  setError(null);
                  setShowLibrary(false);
                  setShowEditor(true);
                }}
                className={cx('group flex min-h-12 items-center justify-between gap-3 rounded-2xl border-2 px-3.5 py-3 text-left text-[14px] font-bold leading-snug transition active:translate-y-px', prompt === idea.prompt ? 'border-ink bg-lime' : 'border-ink/10 bg-white hover:border-ink/35')}
              >
                <span>{idea.prompt}<span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-mute">{idea.category}</span></span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink/15 text-lg leading-none group-hover:bg-lime">+</span>
              </button>
            ))}
            {ideas.length === 0 && <p className="rounded-xl bg-white px-3 py-4 text-sm text-mute">No ideas found. Try another search or category.</p>}
          </div>
          {ideas.length === 18 && <p className="mt-2 text-center text-xs text-mute">Showing 18 matches. Search or choose a category to find more.</p>}
          <div className="mt-3 rounded-2xl border-2 border-dashed border-ink/20 bg-white p-4 text-center">
            <p className="font-display font-extrabold">Got your own question? 😎</p>
            <p className="mt-1 text-sm text-mute">No templates needed. Go full original.</p>
            <button
              type="button"
              onClick={() => {
                setPrompt('');
                setOptions(['', '', '', '']);
                setCorrect(-1);
                setError(null);
                setShowLibrary(false);
                setShowEditor(true);
              }}
              className="btn btn-secondary mt-3 !min-h-[46px] !rounded-xl !px-4 !text-[15px]"
            >
              <IconPlus className="h-4 w-4" /> Create my own question
            </button>
          </div>
        </section>
      )}

      {!showEditor && !showLibrary && (
        <button type="button" className="btn btn-secondary mt-4 w-full" onClick={() => setShowLibrary(true)}>
          Browse question ideas
        </button>
      )}

      {showEditor && !initial && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-lime/35 px-4 py-3">
          <p className="text-sm font-bold">Make it personal. The besties should know this 👀</p>
          <button type="button" onClick={() => setShowLibrary(true)} className="shrink-0 text-sm font-extrabold underline underline-offset-4">Ideas</button>
        </div>
      )}

      {showEditor && <>
      <label className="mt-4 block">
        <span className="text-[15px] font-bold">Your question</span>
        <textarea
          className="input mt-1.5 resize-none py-3.5 leading-snug"
          rows={2}
          maxLength={LIMITS.maxPrompt}
          placeholder="What's my go-to food?"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setError(null);
          }}
          autoFocus={!initial}
        />
      </label>

      <fieldset className="mt-4">
        <legend className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
          Answers <span className="font-medium text-mute">· tap ✓ on the right one</span>
          <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide">{options.length} options</span>
        </legend>
        <div className="mt-2 flex flex-col gap-2.5" role="radiogroup" aria-label="Pick the correct answer">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={correct === i}
                aria-label={`Mark option ${i + 1} as the correct answer`}
                onClick={() => {
                  setCorrect(i);
                  setError(null);
                }}
                className={cx(
                  'grid h-[56px] w-[56px] shrink-0 place-items-center rounded-2xl border-2 transition',
                  correct === i ? 'border-ink bg-lime shadow-pop-sm' : 'border-ink/20 bg-white text-ink/25 hover:border-ink/50',
                )}
              >
                <IconCheck />
              </button>
              <input
                className="input"
                value={o}
                maxLength={LIMITS.maxOption}
                placeholder={`Option ${i + 1}`}
                aria-label={`Option ${i + 1}`}
                onChange={(e) => setOption(i, e.target.value)}
              />
              {options.length > LIMITS.minOptions && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  aria-label={`Remove option ${i + 1}`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-mute hover:bg-ink/5"
                >
                  <IconX className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < LIMITS.maxOptions && (
          <button
            type="button"
            onClick={() => setOptions((o) => [...o, ''])}
            className="btn btn-quiet mt-1 !min-h-[44px] gap-1.5 !px-1 text-[15px] no-underline"
          >
            <IconPlus className="h-4 w-4" /> Add another option
          </button>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="mt-3 animate-shake rounded-xl bg-coral-soft px-4 py-3 font-semibold text-coral-deep">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary mt-5 w-full">
        Save question <span aria-hidden="true">✨</span>
      </button>
      </>}
    </form>
  );
}

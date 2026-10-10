import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicQuestion } from '../lib/types';
import { cx } from '../lib/utils';
import { IconCheck, IconX } from './icons';

interface QuizProps {
  questions: PublicQuestion[];
  onComplete: (answers: number[]) => void;
  /** When set, shows a close button (used for the creator's preview). */
  onExit?: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export function Quiz({ questions, onComplete, onExit }: QuizProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [locked, setLocked] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const total = questions.length;
  const q = questions[index];

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const choose = useCallback(
    (i: number) => {
      if (locked !== null) return;
      setLocked(i);
      const next = [...answers, i];
      timer.current = window.setTimeout(() => {
        if (next.length >= total) {
          onComplete(next);
          return;
        }
        setAnswers(next);
        setIndex((n) => n + 1);
        setLocked(null);
      }, 420);
    },
    [locked, answers, total, onComplete],
  );

  // 1-4 / a-d pick an answer on keyboards.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      const i = '1234'.includes(k) && k.length === 1 ? Number(k) - 1 : 'abcd'.indexOf(k);
      if (i >= 0 && k.length === 1 && q && i < q.options.length) choose(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, q]);

  if (!q) return null;

  return (
    <section className="flex flex-1 flex-col pb-2" aria-labelledby="question-title">
      <div className="flex items-center gap-3 pt-3">
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit preview"
            className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-ink/5"
          >
            <IconX />
          </button>
        )}
        <div
          className="flex flex-1 gap-1.5"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
        >
          {questions.map((_, i) => (
            <span
              key={i}
              className={cx(
                'h-2.5 flex-1 rounded-full border transition-colors duration-300',
                i < index && 'border-ink bg-ink',
                i === index && 'border-ink bg-lime',
                i > index && 'border-transparent bg-ink/10',
              )}
            />
          ))}
        </div>
        <span className="font-display text-lg font-bold tabular-nums">
          {index + 1} / {total}
        </span>
      </div>

      <div key={index} className="flex flex-1 animate-slide-in flex-col">
        <h2
          id="question-title"
          className="mt-8 break-words text-[27px] font-extrabold leading-[1.12] sm:text-[34px]"
        >
          {q.prompt}
        </h2>

        <div className="mt-8 flex flex-col gap-3" role="group" aria-label="Choose an answer">
          {q.options.map((opt, i) => {
            const isPicked = locked === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(i)}
                aria-pressed={isPicked}
                aria-disabled={locked !== null && !isPicked}
                className={cx(
                  'flex min-h-[62px] w-full items-center gap-3 rounded-2xl border-2 border-ink px-3.5 py-3 text-left text-[18px] font-semibold leading-snug shadow-pop transition duration-150 active:translate-y-[3px] active:shadow-none',
                  isPicked ? 'animate-pop bg-lime' : 'bg-white hover:bg-paper',
                  locked !== null && !isPicked && 'opacity-45',
                )}
              >
                <span
                  className={cx(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 font-display text-[15px] font-bold',
                    isPicked ? 'border-ink bg-ink text-lime' : 'border-ink/20 text-mute',
                  )}
                  aria-hidden="true"
                >
                  {isPicked ? <IconCheck className="h-4 w-4" /> : LETTERS[i]}
                </span>
                <span className="min-w-0 break-words">{opt}</span>
                {isPicked && <span className="sr-only"> locked in</span>}
              </button>
            );
          })}
        </div>

        <p className="mt-auto pt-8 text-center text-sm text-mute" aria-hidden="true">
          No cheating. No hints. Just vibes.
        </p>
      </div>
    </section>
  );
}

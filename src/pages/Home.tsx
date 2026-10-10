import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Shell } from '../components/Shell';
import { IconArrowRight, IconCheck } from '../components/icons';

function SampleCard() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-[400px] rotate-[0.5deg] rounded-[28px] border-2 border-ink bg-paper p-5 shadow-soft sm:p-6"
    >
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <span
            key={i}
            className={`h-2.5 flex-1 rounded-full border ${i < 2 ? 'border-ink bg-ink' : i === 2 ? 'border-ink bg-lime' : 'border-transparent bg-ink/10'}`}
          />
        ))}
        <span className="-mt-2 pl-1 font-display text-lg font-bold">3/8</span>
      </div>
      <p className="mt-6 font-display text-[26px] font-extrabold leading-tight">What would your friend probably order at 2 AM?</p>
      <div className="mt-5 flex flex-col gap-2.5">
        {['🍕 Pizza', '🍜 Noodles', '🍔 Burger', '🍛 Biriyani'].map((o, i) => (
          <div
            key={o}
            className={`flex items-center gap-3 rounded-2xl border-2 border-ink px-3.5 py-3 text-[17px] font-semibold shadow-pop-sm ${i === 3 ? 'bg-lime' : 'bg-white'}`}
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg border-2 border-ink/20 font-display text-sm font-bold text-mute">
              {i === 3 ? <IconCheck className="h-4 w-4 text-ink" /> : 'ABCD'[i]}
            </span>
            {o}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { status, username } = useAuth();
  const signedIn = status === 'in';

  return (
    <Shell wide>
      <div className="grid flex-1 content-start items-start gap-12 py-2 lg:content-center lg:items-center lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-fade-up">
          <span className="chip border-ink/15 bg-white">✳ A tiny test of your friendship · 8 questions</span>
          <h1 className="mt-5 text-[40px] font-extrabold leading-[0.99] sm:text-6xl lg:text-[72px]">
            Your friends say they know you. <span className="marker">Prove it.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg leading-snug text-mute">
            Pick questions that feel very you. Drop the link in the group chat. Find out who has actually been paying attention.
          </p>

          <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
            <Link
              to="/create"
              className="group flex min-h-[112px] flex-col justify-between rounded-3xl border-2 border-ink bg-lime p-4 shadow-pop transition active:translate-y-[3px] active:shadow-none"
            >
              <span className="flex items-center justify-between gap-2 font-display text-[21px] font-extrabold leading-tight">
                Make My Challenge <IconArrowRight className="h-5 w-5 shrink-0" />
              </span>
              <span className="mt-3 text-[15px] font-semibold leading-snug text-ink/75">
                {signedIn ? 'Make another one.' : 'Create your first challenge.'}
              </span>
            </Link>
            <Link
              to={signedIn ? '/my' : '/login?next=/my'}
              className="group flex min-h-[112px] flex-col justify-between rounded-3xl border-2 border-ink bg-white p-4 shadow-pop transition active:translate-y-[3px] active:shadow-none"
            >
              <span className="flex items-center justify-between gap-2 font-display text-[21px] font-extrabold leading-tight">
                My Challenges <IconArrowRight className="h-5 w-5 shrink-0" />
              </span>
              <span className="mt-3 text-[15px] font-semibold leading-snug text-ink/75">
                {signedIn ? `Signed in as @${username}.` : 'Already created one? Find your challenges here.'}
              </span>
            </Link>
          </div>
          <p className="mt-4 text-[15px] text-mute">
            Got a link from a friend?{' '}
            <Link to="/take" className="font-bold text-ink underline underline-offset-4">
              Take a Challenge
            </Link>
          </p>

          <ol className="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm font-semibold leading-snug">
            {[
              ['1', 'Pick questions that sound like you'],
              ['2', 'Drop the link anywhere'],
              ['3', 'Find out who pays attention'],
            ].map(([n, t]) => (
              <li key={n}>
                <span className="mb-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink font-display text-sm text-lime">
                  {n}
                </span>
                {t}
              </li>
            ))}
          </ol>

        </div>

        <div className="animate-fade-up lg:block">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <span className="text-sm font-bold uppercase tracking-[0.12em] text-mute">A little preview</span>
            <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-bold">No awkward bestie energy</span>
          </div>
          <SampleCard />
          <div className="mx-auto mt-4 flex max-w-[400px] flex-wrap justify-center gap-2">
            {['👋 Even hi-bye friends', '🍟 Food opinions', '🎧 Music taste', '💀 Group-chat chaos'].map((label) => (
              <span key={label} className="chip !border-ink/10 !bg-white !text-[13px]">{label}</span>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

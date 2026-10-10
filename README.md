# prove it

"How well do you actually know me?" A mobile-first social challenge game.
Create a challenge, share the link, friends play (no account), everyone gets a score, the creator gets a leaderboard.

**Stack:** React 18 · Vite · TypeScript · Tailwind · Supabase (optional)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (also reachable on your phone via the LAN URL)
```

With no config it runs in **demo mode**: data lives in your browser's localStorage, so the whole loop works
but links only open in the same browser. To share with real people, connect Supabase.

## Connect Supabase (real sharing)

1. Create a project at supabase.com.
2. SQL Editor → paste all of `supabase/schema.sql` → Run. Safe to re-run, and it upgrades an earlier version of the schema in place.
3. Copy `.env.example` to `.env` and fill in Project URL + anon key (Settings → API).
4. Restart `npm run dev`. The "Demo mode" badge disappears.

## Creator accounts (lightweight, no email, no password)

A creator picks a **username** and a **personal check** (one of 8 questions plus their answer).
That's the whole account. It exists so they can always get back to their challenges.

- **Make My Challenge** → first time: username + personal check → straight into creating (no second login).
- **My Challenges** → username → their question appears → answer → dashboard.
- One creator can have many challenges; each has its own link, stats and leaderboard.
- Participants never need any of this. `/challenge/:code` stays fully public.

What happens to the answer:

- Normalised (trim, collapse spaces, lower-case) and hashed with **bcrypt inside Postgres**. Only the hash is stored.
- No function returns the answer or the hash, and RLS blocks direct table reads.
- It is never put in a URL or localStorage. After login the browser keeps only a random session token
  (30 days; only its SHA-256 is stored server-side). Log out deletes it.
- Usernames are unique and case-insensitive (`Sam123` = `sam123`).
- Login doesn't reveal whether a username exists: unknown usernames get a (stable, fake) question and the same
  "that answer doesn't match" message. 5 wrong answers pause that account for 15 minutes.
- Every creator function checks the session AND that the challenge belongs to that creator.

This is deliberately not high-security authentication: a personal answer is guessable by people who know the creator.
It protects leaderboards and recovery for a fun social product. Don't use it for anything sensitive.

If you already deployed the first version: re-run the new `schema.sql`. Old challenges stay playable, but they had no
owner, so they won't appear on a dashboard.

## Deploy

`npm run build` → deploy `dist/` to Vercel or Netlify (SPA rewrites are included: `vercel.json`, `public/_redirects`).
Set the two `VITE_SUPABASE_*` env vars, and optionally `VITE_PUBLIC_URL` for share links.

## Routes

| Route | What |
|---|---|
| `/` | Home: Make My Challenge / My Challenges / Take a Challenge |
| `/create` | First time: creator setup. Then name, build 5-12 questions (draft autosaves), preview, create |
| `/created/:code` | "Your challenge is ready": share styles, copy / share / WhatsApp / Instagram |
| `/login` | Welcome back: username → personal question → answer |
| `/my` | Dashboard: all your challenges (leaderboard, copy link, share, open, delete) |
| `/challenge/:code` | Public. What friends open: connection level, quiz, reveal, viral CTA |
| `/challenge/:code/results` | Leaderboard for that one challenge (creator session required) |
| `/take` | Paste a link or code |

## Customise the copy

- `src/lib/tiers.ts`: connection levels, result tiers, headlines, roast lines
- `src/lib/share.ts`: the four share-message styles
- `src/lib/suggestions.ts`: starter questions
- `src/lib/security.ts`: the 8 personal questions (keep in sync with `private.personal_questions()` in `schema.sql`)
- `src/lib/types.ts` `LIMITS`: question / option counts

## Known limits (MVP)

- Link previews (WhatsApp/iMessage cards) show the generic site title, since this is a client-rendered SPA. Per-challenge previews need an edge function that serves OG tags.
- No rate limiting or moderation on the public RPCs yet. Add Supabase rate limits / captcha before a big launch.
- A "person" is a browser + name. Clearing storage means a replay counts as a new person.
- No rate limit on account creation yet; add Supabase rate limits / a captcha before a big launch.
- If a creator forgets their personal answer there is no reset (no email on file by design).

# Cuadre

Two-cycle packaging reconciliation for a Mexican consumer-goods company's packaging data. Imports supplier data per cycle, shows what changed, requires a decision with a reason for every exception, keeps version history, and exports a traceable evidence CSV. It does not calculate fees, file declarations, or make environmental claims. All demo data is invented and labeled SIMULADO.

Packet: `docs/PACKET.md`. Build prompt: `docs/IMPLEMENTATION_PROMPT.md`. Decisions: `DECISIONS.md`.

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your own values (never commit it).
3. Run `supabase/schema.sql` in a Supabase project (SQL editor). Enable Google sign-in.
4. `npm run dev`
5. Offline checks: `npx tsx scripts/verify.ts`

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public by design; RLS protects data.
- `GEMINI_API_KEY`: server only, optional. Without it the AI panels report that they are unavailable.
- `GEMINI_MODEL`: optional, defaults to `gemini-3.5-flash-lite`.

## Deploy

Vercel (Hobby) with the env vars above; add the Vercel URL plus `/auth/callback` to the Supabase redirect URLs and to the Google OAuth client.

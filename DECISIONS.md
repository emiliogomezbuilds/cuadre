# DECISIONS

## Session 1 (24-25 Oct 2026)

- Vacuum: two-cycle packaging reconciliation (Team 8 Blueprint, Condition 4). Operator role.
- Packet written and committed before any code.
- Reused stack (Next.js, Supabase Google auth + RLS, Vercel, Gemini) to spend time on the reconciliation logic, not setup.
- Decision rule: no default choice anywhere; every exception needs a choice and a reason of 5 to 300 characters.
- Versions and decisions are append-only (no update/delete policy).
- Unsupported recycled-content values are exported empty and labeled "sin sustento"; supplier references are labeled "no verificada por Cuadre". A wording scan fails the checks on any verified-recycling phrase.
- Worker-related CSV columns cause the whole file to be refused. No worker profiling or worker-linked claims exist anywhere.
- AI rows only enter after a per-row confirmation, and a quote must appear word for word in the pasted text.
- Approval is single-review in v1, and the export says so.
- The local production build stalls in the sandbox, so Vercel's build is the real build check.

## Mechanical test pass (25 Oct 2026, live URL)

- Worker-column file: refused with a message (pass).
- Bad-values file: imported and flagged, not dropped; a row without SKU offered only "pedir" or "rechazar" (pass).
- Approval gate refused with undecided exceptions (pass).
- Bug found: a 3-row file against a 33-component base produced 33 "Ya no aparece" cards with no warning. Fixed: an amber warning when the file lacks half or more of the base, telling the user to re-import the full file before deciding.
- Bug found: a blank-SKU card title showed a dangling dot. Fixed: shows "(sin SKU)".

## Session close

- What changed my mind: (fill after the live tests)
- Tomorrow's first move: deploy, then run the live walkthrough with the simulated feed.

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

## Persona test (25 Oct 2026, Ximena, fresh chat)

- Worst finding: a "pedir el dato al proveedor" (or keep, or reject) decision and its reason did not appear in the component history nor in the evidence CSV row, which showed "aprobada en la base sin excepción". The reason existed only in the separate decision-log file, so the tool's own promise ("every decision keeps its why") looked broken to the user. Fixed: the history page lists those decisions per component, and the evidence row shows the decision and reason taken in the exported cycle. New offline check (93 total).
- Also fixed: the approve panel now names which exceptions are still undecided; the card explains that "pedir el dato" sends nothing to the supplier.
- Also fixed (Ximena's last screen): an approved 0 % recycled content was exported as an empty cell, so "0" and "unknown" looked the same. It now exports as 0; it stays empty only when unknown or unsupported (94 checks).
- Also fixed: the landing, limits and effort texts said "las fuentes que revisé" in the first person and Ximena asked who "yo" was. They now say what was checked: the latest press note found (30 August 2026), with the Diario Oficial not checked.
- Not fixed on purpose: "revisión por una sola persona" (Condition 1 says it must be stated, and v1 has one reviewer); no document viewer for evidence (out of scope, see PACKET); the demo-data warnings on the landing page (the app is a demo with invented data).

## Session close (Week 11)

- What changed my mind: (fill after the live tests)
- Tomorrow's first move: deploy, then run the live walkthrough with the simulated feed.

## Week 12 session (1 November 2026): the core-only rebuild

- Venture chosen: Cuadre, under Team 7's uncontested-claim rule for Week 9 (Josep), with Emilio's Week 9 grade not yet posted, Josep's posted — see `docs/VERDICT.md` equivalent, `VERDICT_EmilioGomez.pdf`.
- Packet, charter (`docs/CHARTER.md`) and personas (`docs/PERSONAS.md`) written and committed before any code this week.
- Scope cut: the AI proposal screens, the label-photo reader and the simulated supplier feed are hidden behind `lib/flags.ts` (`CORE_ONLY = true`). The code and its tests stay in the repo.
- New this week: status travels with the value, on screen (`lib/statusline.ts`) and in the export (`valor_con_estado` column, `lib/export.ts`). 99 offline checks (was 94).
- Real domain connected: `cuadre.dev`, via the GitHub Student Developer Pack (Name.com, free first year). Supabase Site URL and redirect URLs updated.
- Venture site skeleton: `/product` and `/about`, stating the need, payer and 10:1 case as open, matching `VERDICT_EmilioGomez.pdf` exactly rather than a cleaner marketing version.
## Mechanical test pass (1 November 2026, live URL)

- Checked the public pages (`/`, `/product`, `/about`, `/limites`, `/privacidad`) directly on `cuadre.dev`: all load, the nav shows Producto and Quién paga, and `/about` states the open gates in the same words as `VERDICT_EmilioGomez.pdf`, not a cleaner version.
- Bug found: `CORE_ONLY` only hid the AI and simulated-feed panels from the screen (`app/ciclos/[id]/page.tsx`). The five server actions behind them (`simFeedAction`, `aiTextProposeAction`, `aiTextConfirmAction`, `aiPhotoProposeAction`, `aiPhotoConfirmAction`) had no guard of their own, so a direct call would still have run them — the packet's own promise, "nothing beyond the core is reachable," was not actually true at the server. Fixed: each of those five actions now checks `CORE_ONLY` and returns a plain scope message before touching the database, auth or the AI call. 99 offline checks still pass; `tsc --noEmit` clean.

## Persona test (1 November 2026, Karla, live cycle 1 + evidence export)

- Worst finding: the evidence CSV's `sku` column held values like `GEL-250` as a bare string. Opened in a spreadsheet app (Excel/Numbers), the app's own auto-formatting silently reinterpreted it — `GEL-250` displayed as `-GEL 250.00` — changing the identifier a reviewer would use to look the component up, with no warning. For a tool whose whole promise is that nothing changes silently, a corrupted SKU on open is a disqualifying first impression. Fixed: `sku` and `component` are now written as an Excel/Numbers text-locked literal (`="GEL-250"`), which both applications read back as the original text instead of guessing a type for it. New offline checks confirm the locked format and that an embedded quote still escapes correctly (101 checks, was 99).
- Also noted, not fixed: on the already-approved base cycle (Ciclo 1), the summary still read "Requieren decisión humana: 34 / Decisiones tomadas: 0 de 34" even though the cycle is Aprobado. On a baseline cycle every component is new by definition and needs no real decision, so the "0 of 34 decided" framing reads like unfinished work on an approved cycle. Left as-is this week (scope cut, `docs/PACKET.md` section 10) but flagged for the baseline-cycle screen specifically, not the comparison screen, where the wording is correct.
- What changed my mind: the AI/simulated-feed bug (mechanical pass) was about a promise not enforced; this one is about a promise silently broken by software outside Cuadre's control (the spreadsheet app), which is the harder case — the fix has to work defensively, not just correctly.
- Tomorrow's first move: push this fix, confirm the third Vercel deploy on `cuadre.dev`, record the demo video.

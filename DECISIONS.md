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

## Week 14 real pricing conversation (15 November 2026, Mauricio, WhatsApp, logged as it happened)

Real conversation, not a scripted test. Mauricio is not the payer — his boss Felipe approves spend — so every number below is his estimate of what he and Felipe would accept, not a confirmed purchase. Logged in full regardless of how it reads, per the packet's own commitment.

- **One real condition already met**: his "no double capture" requirement is satisfied by CSV import as it already works — no manual recapture once a file is uploaded.
- **One real gap found, not met**: "no double capture" also requires a column mapping that's taught once and remembered. Checked `lib/parse.ts` directly before answering him: it only matches a fixed dictionary of known header names (Spanish/English, order-independent); an unrecognized header set is rejected outright, with no per-user remembered mapping. Told him this plainly after initially telling him (wrongly) that it was already resolved — corrected in the same exchange, logged as a real miss on my part, not smoothed over.
- **Terminology collision found**: "valor declarado" (the pricing unit on `/pricing`) collides with the customs/pedimento meaning of the same phrase in comercio exterior, and reads to him as a percentage-based customs-agent fee, not software pricing. Renamed in conversation to "valor del embarque"; `/pricing`'s actual copy has not been changed yet — that's a follow-up, not done tonight.
- **Segment finding that complicates the Week 14 narrative, not confirms it**: Mauricio does not sell to the US or EU — Guatemala and Costa Rica, ~15% of sales — and no foreign buyer has ever required packaging documentation from him. The held-shipment incident that is the whole reason Cuadre exists to him was a packing-list mismatch (piezas, cajas, pesos), not an environmental-compliance failure. A Costa Rican distributor asked about % reciclado exactly once and never followed up. This means the brief's central pricing story — EU PPWR/California SB 54 creating urgency for an "export-facing" segment paying for compliance documentation — does not describe the one real exporter tested. His actual willingness to pay is driven by operational accuracy (don't get a shipment held again), which is closer to Cuadre's existing reconciliation function than to any regulatory-documentation story.
- **Price numbers, his estimate only**: MXN 800–1,200/month he'd personally call reasonable; MXN 500–700/month, or an annual total under MXN 10,000, is what he believes Felipe approves without pushback. The current `low` band (MXN 2,000/ciclo) implies roughly MXN 24,000/year if a cycle runs monthly — well above the ceiling he named. He also rejected a per-cycle unit outright: his supplier data arrives roughly monthly and import data every 2–3 weeks, so "a cycle" has no clean mapping to his real cadence, and he said a flat monthly or annual fee (like Aspel) would make more sense to him than a usage- or value-based unit.
- **New hard blocker, unrelated to price**: no factura, no payment, at any price. Cuadre has no invoicing/RFC capability today — new scope item, not addressed this week.
- **What he gave with a caveat attached**: all of the above is "tómalo con pinzas" — his price for something that doesn't exist yet from his side; he said he'd revisit once he sees it work against his real column structure.
- **Next step agreed**: he is sending a structure-only sample file this week (his real column names/order, invented data) so Cuadre can be tested against his actual Excel shape, not an assumed format. He is unavailable 26–30 November (month-end close) and through December (year-end inventory); first week of December is the proposed window for an actual live test before year-end.
- **What changed my mind**: going into this conversation, the Week 14 brief's two segments were built around a regulatory-urgency story (foreign buyer compliance pressure) for the "export" side. The one real exporter tested has real export exposure and a real incident, and neither is explained by that story — his incident and his willingness to pay are both about packing-list accuracy, not packaging-content compliance. The declared-value-band *mechanism* (price scales with what's at risk, not how often the tool runs) may still be right; the *story* attached to it, and the unit itself (per-cycle vs. flat monthly/annual), need to be re-argued, not just re-skinned, before `/pricing` can be called tested rather than assumed.
- **Tomorrow's first move**: get the sample file, confirm the first-week-of-December test slot, and decide — as its own Brain Bending question, not a same-day patch — whether the pricing unit should move from per-cycle/declared-value to a flat monthly or annual fee, and whether the segment story should shift from "foreign regulatory pressure" to "packing-list accuracy / avoided held shipment."

## Week 14 Persona pass (15 November 2026, live on cuadre.dev, skeptical-visitor role via the browser tool)

Layer 1, not a sixth real session (docs/PACKET.md section 12): walked `/pricing` live, signed out, as a skeptical prospective payer, directly in the browser rather than a separate fresh-chat impersonation.

- Confirmed working: anonymous access shows prices and the full simulator but correctly refuses to save ("Inicia sesión…"), no leaked data, no error. Negative input (-5 clientes) correctly produces MXN 0, never a negative number. Non-numeric input ("abc") is handled gracefully, no crash.
- **Worst finding, fixed**: typing an unrealistic value (999,999,999 clientes) into the live simulator produced "Proyección anual: $7,999,999,992,000" with no guardrail — the database already rejects a save above 100,000 customers / 1,000 cycles (`supabase/schema.sql`), but the live on-screen number had no such ceiling, so the simulator and a real save could show two different promises. Fixed in `lib/pricing.ts`'s `projectRevenue`, the single function both the live display and the save path call, so the number shown and the number a save would accept are always the same. Two new offline checks (130 total, was 128). Committed (`6c95f63`), pushed and redeployed by Emilio.
- **Noted, not fixed**: switching "Segmento" between export and domestic never changes the computed price — only "Banda de valor declarado" does. This matches the intended design (segment is the urgency/market story from the Brain Bending fight, not a price multiplier), but a skeptical visitor picking their real situation and watching the number not move could read it as decorative rather than functional. Left as a scope note for next week, not fixed tonight — changing it would be a pricing-logic decision, not a bug fix.
- What changed my mind: Week 12 and 13's Persona tests found gaps between what the product promised and what it enforced (a decision's reason missing from an export row, a value's status not displayed). This week's is the same shape of bug but on the pricing page itself — "los supuestos quedan a la vista" is only true if the number shown can't diverge from the number a save would actually accept.

## Week 15 Brain Bending: the three-week-old recruiting gap, found by checking the record, not memory (22 November 2026)

Real adversarial fight (OPERATOR lens, CHAT_EmilioGomez.pdf, Week 15). Summary of the retraction and the confession, since it changes what this week's "audience" work is actually resting on.

- Challenged to name Mauricio's actual recruiting channel rather than assume it, I checked `docs/W13_RECRUITING_PRECOMMIT.md` and the Week 13 session log directly: the precommit's own order of operations put LinkedIn cold outreach to real strangers first (30-40 messages, 5-10% expected response), before any referral. The session log never once cites LinkedIn as a source for any of the five Week 13 testers — only relationship types (board-contact introduction, mutual friend, "strongest candidate considered," stranger, alumni-site briefing).
- **Confession, Emilio's own words**: "No LinkedIn messages were ever sent... I skipped straight to the referral layer because it was faster and I had five sessions due. I never circled back to actually run step one of the plan I'd written down specifically so I couldn't quietly skip it." Step one of the Week 13 precommit has a real n of zero, three weeks running.
- Also corrected in the same fight: I had converted Mauricio's "Estimated" export status into "disproven" ("that segment turned out not to exist for him") — retracted. One person not fitting a segment doesn't close it; it stays Estimated/Unknown.
- Verified, not assumed: "le digo 'lo checo'" and the MXN 10,000/year Felipe ceiling are both Mauricio's own verbatim statements (DECISIONS.md, Week 14 entry), not paraphrase or math backed into from the pricing anchor.
- **The insight that matters more than the gap itself**: the precommit did exactly the job it was built for — it didn't stop the skip, it made the skip checkable. Without a dated file naming LinkedIn as step one, there would be no record to catch the pattern against at all.
- **Converged on a harder forcing function than a fourth precommit document**: 15 real messages (scaled down from 30-40 on purpose — an ambitious number is exactly how "later this week" sneaks in), real strangers only, by end of day Tuesday 24 November, pointed at a new no-sign-in capture page (`/contacto`). The only evidence this week's submission is allowed to carry for "Distribution test" and "Honest results" is a raw export of the `signups` table — real rows and timestamps, or a genuinely empty export — not a written account of what happened. Same move as `scripts/verify.ts`: the thing that has to be true is an artifact, not a sentence trusted to grade itself.
- What changed my mind: that a written precommit is necessary but not sufficient discipline on its own, three weeks running — the thing that finally forces the test to actually happen is making the deliverable itself incomplete without a database artifact the author can't narrate around.

## Week 15 Business Bending build (22 November 2026)

- `docs/PACKET.md` rewritten for distribution scope (old version archived as `PACKET_W14.md`), committed before any code (`a4e33fa`).
- `signups` table (Supabase migration + schema), RLS enabled, insert-only for `anon`/`authenticated`, no select policy for any app role — the raw export is read only via the Supabase SQL editor, never exposed through the app, since this table holds real contact information from real people. `/contacto`, a public page requiring no sign-in, built on top of it. 140 offline checks (up from 130), `tsc` clean. Committed (`4292bb6`), migration run and redeployed by Emilio.
- **Verified live, not just mechanically**: walked `/contacto?src=linkedin_cold` signed out via the browser tool, submitted a clearly-labeled test row, and confirmed via a direct Supabase query that it landed with the correct `source` tag and a real timestamp — then deleted that test row immediately so it can't contaminate Tuesday's real count.
- **Layer-1 persona pass, same session**: read `/contacto` fresh, as a cold coordinator with zero prior context on Cuadre. Worst finding: the page's own disclaimer duplicated the main site's general footer almost verbatim ("no verificamos que algo se haya reciclado," "no calificamos cuotas") — language about recycling and customs fees that this page never introduces, reading as copy-paste residue rather than something written for a first-time cold reader. Fixed: rewritten to state only what this page actually promises (not a quote, data used only to follow up). Committed (`e5b6948`), 140 checks still pass.
- Two of the three planned launch-playbook assets finished and committed: the LinkedIn message itself ("El ciclo que se detuvo," sent as the body of the cold messages, not a public post, so it reaches only the precommitted target roles) and the "número con estatus" image card (`docs/asset_w15_numero_con_estatus.png`). The third concept, "Antes de que te lo exijan," is represented by `/contacto`'s own headline and copy, per the packet's plan.
- Still open, by design, until after Tuesday: the 15 real messages themselves (Emilio's to send), and "Honest results," which cannot honestly be written before the test has had time to run.

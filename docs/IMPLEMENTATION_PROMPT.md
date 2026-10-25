# Implementation prompt, Cuadre (Week 11)

Build the app described in `docs/PACKET.md`. Do not start coding before reading it. Spanish screens, English code and comments.

## Product
A signed-in coordinator at a Mexican producer or importer reconciles packaging data across two cycles. She imports a cycle-1 file, approves it as the baseline, brings in cycle-2 data, resolves every exception with a recorded choice and reason, approves the cycle and exports an evidence file. Cuadre calculates no fee, files no declaration and gives no regulatory advice (the reglamento is unpublished). All demo data is invented and labeled.

## Data model (Supabase, RLS on every table, policies scoped to `auth.uid()`)
- `cycles(id, user_id, name, number, status draft|approved, simulated, created_at, approved_at, approved_single_review)`
- `rows(id, cycle_id, user_id, sku, component, material, weight_g, recycled_pct, supplier, evidence_ref, source_kind, source_file, source_line, status_origin csv|simulated|ai_text|ai_photo, quote, created_at)`
- `decisions(id, cycle_id, user_id, key, kind, choice accept_new|keep_previous|request_supplier|reject_row, reason, bulk, created_at)`: insert and select only
- `versions(id, user_id, sku, component, version, cycle_id, values jsonb, decision_id, source_origin, created_at)`: insert and select only, append-only
- `consents(id, user_id, kind ai_text|ai_photo, created_at)`: counts the daily AI limit
No supplier score, no profile, no worker or collector column anywhere.

## Features (small and testable, build in this order)
1. **Parser** (`lib/parse.ts`): CSV text to rows. Handles byte-order mark, comma or semicolon delimiter, decimal comma, quoted fields, accents and header aliases (`sku`, `componente`, `material`, `peso_g` or `peso`, `reciclado_pct`, `proveedor`, `evidencia`, `fuente`). Refuses the whole file if any header mentions a worker-related word (recolector, pepenador, acopiador, scavenger, waste picker). Limits: 1 MB, 500 rows. Acceptance: a malformed file never partly imports.
2. **Engine** (`lib/engine.ts`, pure): compare incoming rows with the approved baseline keyed by `sku|component`. Row-level issues: missing required field, invalid number (weight must be greater than 0 and at most 5000 g; recycled percent 0 to 100), unknown material (internal list, labeled internal), recycled value greater than 0 without evidence reference (unsupported claim), evidence reference reused across different SKU or supplier (possible double counting, not verified), `source_kind = recibo_papel` (non-digital: human review). Diff kinds: unchanged (auto match), changed (minor or large: weight change of 10 percent or more, any material change, recycled change of 5 points or more or supplier change is large), new, removed, conflict (same key twice in one import with different values). Acceptance: every non-unchanged item gets a stable `key` and a list of reasons.
3. **Decisions** (`lib/decisions.ts`, pure): a decision needs a choice from the four allowed and a reason of at least 5 characters; no default. Bulk accept is allowed only for large=false changed items, requires one shared reason and is stored with `bulk=true`. Acceptance: server refuses anything else.
4. **Approval gate**: a cycle can be approved only when every exception has a decision. `request_supplier` decisions keep the previous version and stay marked open. Approval appends a new version only where the decision changed the value; old versions are never updated or deleted. Approval records `approved_single_review = true` in v1.
5. **Export** (`lib/export.ts`, pure): CSV with BOM and columns sku, componente, material, peso_g, reciclado_pct (empty when unsupported), afirmacion_reciclado (`sin sustento`, `referencia declarada por el proveedor, no verificada por Cuadre` or empty), estado_evidencia, version, ciclo, fuente, decision, motivo, revision. A second CSV exports the decision log. The exporter never prints the words "reciclado verificado". Acceptance: a test greps both exports.
6. **Manual-effort summary** (`lib/effort.ts`, pure): rows matched automatically, decisions made by hand, bulk decisions, open supplier requests, elapsed time from first import to approval, plus the fixed list of data Cuadre does not have.
7. **Labeled simulated feed** (`lib/simfeed.ts`): deterministic invented baseline (12 SKUs, 6 suppliers) and a cycle-2 revision batch that exercises every exception kind. Every row has `status_origin = simulated` and shows "SIMULADO".
8. **AI proposals** (`lib/ai.ts`, Gemini REST, server only, needs a consent row): text mode returns rows with a `quote`; code discards any row whose quote is not a substring of the pasted text and any number not present in its quote. Photo mode proposes material and weight from a label image, which is never stored. Limits: text 4000 characters, image 4 MB PNG/JPG/WebP, 30 AI calls per user per day. Untrusted text is delimited and declared data. Acceptance: proposals are never written to `rows` until the coordinator confirms each one with a source type chosen from a list (no default).
9. **Pages** (Spanish): landing, login, dashboard (cycles), cycle page (import, exceptions, effort, approve), history per component, export, privacy, evidence-and-limits page. Delete-all-my-data action.
10. **Wording scan** (`lib/wording.ts`): fails the build on claims such as "reciclado verificado", "impacto ambiental", "100 % reciclable" or any sentence about collectors or workers.

## Security floor
No secrets in code or repo (Vercel environment variables only). Google auth through Supabase; middleware redirects anonymous visitors. RLS on every table. Server-side validation of every input (type, length, range, allow-list). Invented data only.

## Commit plan (packet already committed first)
1. Implementation prompt (this file).
2. Scaffold Next.js, Tailwind, Supabase auth plumbing, shell.
3. Schema with RLS, no update or delete policy on versions and decisions.
4. Parser, engine, decisions, export, effort, simulated feed, wording scan, offline checks.
5. AI proposals with the quote validator and its checks.
6. Server actions and pages.
7. README, DECISIONS, then fixes found in testing.

## Done when
`npx tsc --noEmit`, `next build` and `npx tsx scripts/verify.ts` pass; the live URL completes the success definition in the PACKET end to end with the simulated feed.

// Offline checks: run with `npx tsx scripts/verify.ts`. No network, no database. Exits 1 on any failure.
import fs from "node:fs";
import path from "node:path";
import { parseCsv, MAX_ROWS } from "../lib/parse";
import { reconcile, keyOf, type Exception } from "../lib/engine";
import { allowedChoices, bulkEligible, validateDecision, planApproval, pendingExceptions, type Decision } from "../lib/decisions";
import { evidenceCsv, decisionLogCsv, evidenceStatus, recycledClaim, type ExportComponent } from "../lib/export";
import { effort } from "../lib/effort";
import { scanWording } from "../lib/wording";
import { simBaselineRows, simUpdateRows, simBaselineCsv } from "../lib/simfeed";
import type { Approved, InRow } from "../lib/types";
import { checkAiRows, parseAiRows, parsePhoto } from "../lib/ai-parse";

let pass = 0;
const fails: string[] = [];
function check(name: string, ok: boolean) {
  if (ok) pass++;
  else fails.push(name);
}
const eq = (name: string, a: unknown, b: unknown) => check(`${name} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`, JSON.stringify(a) === JSON.stringify(b));
const opts = { fileName: "t.csv", origin: "csv" as const };

// ------------------------------------------------------------ parser
{
  const ok = parseCsv("sku,componente,material,peso_g\nA-1,Tapa,PP,3.2\n", opts);
  check("parser: minimal file", ok.ok && ok.rows.length === 1 && ok.rows[0].weightG === 3.2 && ok.rows[0].sourceLine === 2);
  const bom = parseCsv("﻿sku;componente;material;peso_g\r\nA-1;Tapa;PP;3,2\r\n", opts);
  check("parser: BOM, semicolon, decimal comma, CRLF", bom.ok && bom.rows[0].weightG === 3.2);
  const quoted = parseCsv('sku,componente,material,peso_g,proveedor\nA-1,"Tapa, grande",PP,3.2,"Envases ""Delta"""\n', opts);
  check("parser: quoted fields", quoted.ok && quoted.rows[0].component === "Tapa, grande" && quoted.rows[0].supplier === 'Envases "Delta"');
  const alias = parseCsv("Código,Parte,Material,Peso,Contenido reciclado,Proveedor,Referencia,Tipo fuente\nx-9,Botella,PET,20,15,P,R-1,declaración del proveedor\n", opts);
  check("parser: accented aliases", alias.ok && alias.rows[0].sku === "X-9" && alias.rows[0].recycledPct === 15 && alias.rows[0].sourceKind === "declaracion_proveedor" && alias.rows[0].evidenceRef === "R-1");
  const worker = parseCsv("sku,componente,material,peso_g,recolector\nA,B,PP,1,Juan\n", opts);
  check("parser: refuses a worker-related column", !worker.ok && /personas/.test(worker.ok ? "" : worker.error));
  check("parser: refuses pepenador, acopiador, trabajador", ["pepenador", "acopiador", "trabajador"].every((w) => !parseCsv(`sku,componente,material,peso_g,${w}\nA,B,PP,1,x\n`, opts).ok));
  check("parser: missing required column", !parseCsv("sku,componente,material\nA,B,PP\n", opts).ok);
  check("parser: header only", !parseCsv("sku,componente,material,peso_g\n", opts).ok);
  const bad = parseCsv("sku,componente,material,peso_g,reciclado_pct,fuente_tipo\nA,B,PP,abc,12x,magia\n", opts);
  check("parser: bad numbers and bad source type are flagged, not dropped", bad.ok && bad.rows[0].bad.includes("peso_g") && bad.rows[0].bad.includes("reciclado_pct") && bad.rows[0].bad.includes("fuente_tipo"));
  const many = "sku,componente,material,peso_g\n" + Array.from({ length: MAX_ROWS + 1 }, (_, i) => `S${i},C,PP,1`).join("\n");
  check("parser: row limit", !parseCsv(many, opts).ok);
  check("parser: size limit", !parseCsv("x".repeat(1_000_001), opts).ok);
  check("parser: blank lines skipped, line numbers kept", (() => { const r = parseCsv("sku,componente,material,peso_g\n\nA,B,PP,1\n\nC,D,PP,2\n", opts); return r.ok && r.rows.length === 2 && r.rows[0].sourceLine === 3 && r.rows[1].sourceLine === 5; })());
}

// ------------------------------------------------------------ simulated feed
const base = simBaselineRows();
const upd = simUpdateRows();
check("simfeed: 31 baseline rows, 35 update rows", base.length === 31 && upd.length === 35);
check("simfeed: every row is labeled simulated", [...base, ...upd].every((r) => r.origin === "simulated" && r.sourceFile.startsWith("SIMULADO")));

const toApproved = (r: InRow, v = 1): Approved => ({ sku: r.sku, component: r.component, material: r.material, weightG: r.weightG, recycledPct: r.recycledPct, supplier: r.supplier, evidenceRef: r.evidenceRef, sourceKind: r.sourceKind, origin: r.origin, sourceFile: r.sourceFile, sourceLine: r.sourceLine, version: v });
const baselineMap = new Map<string, Approved>(base.map((r) => [keyOf(r.sku, r.component), toApproved(r)]));

// ------------------------------------------------------------ engine
const r0 = reconcile(base, new Map());
check("engine: clean baseline matches all 31, no exceptions", r0.mode === "baseline" && r0.matched.length === 31 && r0.exceptions.length === 0);
const rec = reconcile(upd, baselineMap);
check("engine: update mode", rec.mode === "update");
eq("engine: matched count", rec.matched.length, 22);
eq("engine: exceptions count", rec.exceptions.length, 13);
const byKind = (k: string) => rec.exceptions.filter((e) => e.kind === k).length;
eq("engine: changed", byKind("changed"), 7);
eq("engine: new", byKind("new"), 4);
eq("engine: conflict", byKind("conflict"), 1);
eq("engine: removed", byKind("removed"), 1);
const ex = (sku: string, comp: string) => rec.exceptions.find((e) => e.key === keyOf(sku, comp)) as Exception;
check("engine: large weight change", ex("LIM-500", "Botella").large && ex("LIM-500", "Botella").diffs.some((d) => d.field === "peso_g" && d.from === "24" && d.to === "21"));
check("engine: unsupported recycled claim flagged", ex("DET-1L", "Tapa").flags.includes("unsupported_claim") && ex("DET-1L", "Tapa").large);
check("engine: paper source flagged and new", ex("DET-1L", "Sello").flags.includes("paper_source") && ex("DET-1L", "Sello").kind === "new");
check("engine: supplier change is large", ex("SUA-900", "Botella").large && ex("SUA-900", "Botella").diffs.some((d) => d.field === "proveedor"));
check("engine: possible double counting flagged (not verified)", ex("VID-250", "Frasco").flags.includes("double_count") && /no verificado/.test(ex("VID-250", "Frasco").reasons.join(" ")));
check("engine: conflict has two candidates", ex("GEL-250", "Tapa").candidates.length === 2 && ex("GEL-250", "Tapa").kind === "conflict");
check("engine: missing weight flagged and cannot be accepted", ex("AMB-400", "Lata").flags.includes("missing") && !ex("AMB-400", "Lata").canAccept);
check("engine: removal detected", ex("JAB-300", "Caja").kind === "removed" && ex("JAB-300", "Caja").previous?.version === 1);
check("engine: minor changes are not large", !ex("SUA-2L", "Botella").large && !ex("DET-3L", "Tapa").large);
check("engine: bulk eligibility only for minor, unflagged changes", bulkEligible(ex("SUA-2L", "Botella")) && bulkEligible(ex("DET-3L", "Tapa")) && !bulkEligible(ex("LIM-500", "Botella")) && !bulkEligible(ex("DET-1L", "Tapa")) && !bulkEligible(ex("AMB-400", "Lata")));
check("engine: unchanged row with the same shared reference is not re-flagged", !rec.exceptions.some((e) => e.key === keyOf("DET-3L", "Garrafa")));
check("engine: an unknown material cannot be accepted", (() => { const rr = reconcile([{ ...base[0], material: "Plastiquito" }], baselineMap).exceptions.find((e) => e.key === keyOf(base[0].sku, base[0].component))!; return rr.flags.includes("unknown_material") && !rr.canAccept; })());
check("engine: invalid range flagged", (() => { const e = reconcile([{ ...base[0], weightG: -1 }, { ...base[1], recycledPct: 140, evidenceRef: "X" }], baselineMap).exceptions.filter((x) => x.flags.includes("invalid")); return e.length === 2; })());
check("engine: reference reused by the same supplier and material is not double counting", !r0.exceptions.length);
check("engine: keys ignore accents and case", keyOf("abc-1", "Cápsula") === keyOf("ABC-1", "capsula"));
check("engine: baseline mode flags clean rows only when they have a problem", (() => { const rr = reconcile([base[0], { ...base[1], recycledPct: 10, evidenceRef: null }], new Map()); return rr.matched.length === 1 && rr.exceptions.length === 1 && rr.exceptions[0].kind === "flag_only"; })());

// ------------------------------------------------------------ decisions
const D = (key: string, choice: Decision["choice"], reason = "motivo de prueba", pick: number | null = null, bulk = false): Decision => ({ key, choice, reason, pick, bulk });
check("decisions: no choice is accepted without being allowed", validateDecision(ex("AMB-400", "Lata"), D(ex("AMB-400", "Lata").key, "accept_new")) !== null);
check("decisions: missing value allows request or keep", allowedChoices(ex("AMB-400", "Lata")).join() === "keep_previous,request_supplier");
check("decisions: reason is required", validateDecision(ex("LIM-500", "Botella"), D("k", "accept_new", "ok")) !== null);
check("decisions: reason too long", validateDecision(ex("LIM-500", "Botella"), D("k", "accept_new", "x".repeat(301))) !== null);
check("decisions: valid accept", validateDecision(ex("LIM-500", "Botella"), D("k", "accept_new")) === null);
check("decisions: conflict needs a pick", validateDecision(ex("GEL-250", "Tapa"), D("k", "accept_new")) !== null && validateDecision(ex("GEL-250", "Tapa"), D("k", "accept_new", "motivo de prueba", 1)) === null && validateDecision(ex("GEL-250", "Tapa"), D("k", "accept_new", "motivo de prueba", 5)) !== null);
check("decisions: pick on a single candidate is refused", validateDecision(ex("LIM-500", "Botella"), D("k", "accept_new", "motivo de prueba", 0)) !== null);
check("decisions: bulk refused on a large change", validateDecision(ex("LIM-500", "Botella"), D("k", "accept_new", "motivo de prueba", null, true)) !== null);
check("decisions: bulk allowed on a minor change", validateDecision(ex("SUA-2L", "Botella"), D("k", "accept_new", "motivo de prueba", null, true)) === null);
check("decisions: new component cannot be 'kept previous'", !allowedChoices(ex("LIM-250", "Botella")).includes("keep_previous") && allowedChoices(ex("LIM-250", "Botella")).includes("reject_row"));
check("decisions: removal choices", allowedChoices(ex("JAB-300", "Caja")).join() === "accept_new,keep_previous,request_supplier");
check("decisions: unknown choice refused", validateDecision(ex("LIM-500", "Botella"), D("k", "lol" as never)) !== null);

// approval gate and plan
const decide = (e: Exception): Decision => {
  const k = e.key;
  if (e.kind === "conflict") return D(k, "accept_new", "tomo la fila que coincide con la ficha", 0);
  if (e.flags.includes("missing")) return D(k, "request_supplier", "falta el peso, se pide al proveedor");
  if (e.kind === "removed") return D(k, "accept_new", "el SKU ya no usa esta caja");
  if (e.key === keyOf("SUA-900", "Botella")) return D(k, "keep_previous", "el cambio de proveedor aún no está documentado");
  if (e.kind === "new" && e.sku === "LIM-250" && e.component === "Etiqueta") return D(k, "reject_row", "etiqueta aún sin ficha");
  return D(k, "accept_new", "confirmado con la ficha técnica del ciclo", null, bulkEligible(e));
};
const decisions = new Map<string, Decision>();
check("approval: refuses with undecided exceptions", (() => { try { planApproval(rec, upd, decisions); return false; } catch (e) { return /Faltan 13/.test(String(e)); } })());
rec.exceptions.forEach((e) => decisions.set(e.key, decide(e)));
check("approval: no pending after deciding", pendingExceptions(rec, decisions).length === 0);
const plan = planApproval(rec, upd, decisions);
const v = (sku: string, comp: string) => plan.versions.find((x) => x.key === keyOf(sku, comp));
check("approval: accepted change appends version 2", v("LIM-500", "Botella")?.version === 2 && v("LIM-500", "Botella")?.values?.weightG === 21);
check("approval: keep_previous appends nothing", v("SUA-900", "Botella") === undefined);
check("approval: reject_row appends nothing", v("LIM-250", "Etiqueta") === undefined);
check("approval: request_supplier appends nothing and is listed as open", v("AMB-400", "Lata") === undefined && plan.openRequests.includes(keyOf("AMB-400", "Lata")));
check("approval: accepted removal appends a removed version", v("JAB-300", "Caja")?.removed === true && v("JAB-300", "Caja")?.version === 2 && v("JAB-300", "Caja")?.values === null);
check("approval: new components start at version 1", v("LIM-250", "Botella")?.version === 1 && v("DET-1L", "Sello")?.version === 1);
check("approval: conflict takes the picked candidate", v("GEL-250", "Tapa")?.values?.weightG === 2.8);
check("approval: unchanged rows get no new version in update mode", v("LIM-1L", "Botella") === undefined);
check("approval: never edits an old version (every planned version is higher than the previous)", plan.versions.every((p) => p.version >= 1 && (baselineMap.get(p.key)?.version ?? 0) < p.version));
const planBase = planApproval(r0, base, new Map());
check("approval: baseline mode appends version 1 for all 31", planBase.versions.length === 31 && planBase.versions.every((p) => p.version === 1));

// ------------------------------------------------------------ effort
const ef = effort(rec, decisions, "2026-10-24T10:00:00Z", "2026-10-24T10:42:00Z");
check("effort: counts", ef.matchedAutomatically === 22 && ef.exceptions === 13 && ef.decided === 13 && ef.decidedInBulk === 2 && ef.decidedByHand === 11 && ef.openSupplierRequests === 1 && ef.elapsedMinutes === 42);

// ------------------------------------------------------------ export
const comps: ExportComponent[] = plan.versions.filter((p) => p.values).map((p) => ({ approved: p.values as Approved, cycleName: "Ciclo 2", decision: decisions.has(p.key) ? { choice: decisions.get(p.key)!.choice, reason: decisions.get(p.key)!.reason, bulk: decisions.get(p.key)!.bulk } : null, openRequest: false, singleReview: true }));
const csv = evidenceCsv(comps);
check("export: BOM and header", csv.startsWith("﻿sku,componente"));
const tapa = comps.find((c) => c.approved.sku === "DET-1L" && c.approved.component === "Tapa")!;
check("export: unsupported recycled claim is labeled and its value is empty", recycledClaim(tapa.approved) === "sin sustento" && csv.split("\r\n").find((l) => l.startsWith("DET-1L,Tapa"))!.includes(",,sin sustento,"));
const garrafa: Approved = { ...base.find((r) => r.sku === "DET-3L" && r.component === "Garrafa")!, version: 1 } as unknown as Approved;
check("export: a reference is shown as declared, not verified", /no verificada por Cuadre/.test(recycledClaim(toApproved(base.find((r) => r.sku === "DET-3L" && r.component === "Garrafa")!))) && garrafa !== undefined);
check("export: simulated rows say SIMULADO", /SIMULADO/.test(evidenceStatus(toApproved(base[0]))));
check("export: paper source is labeled for human review", /registro en papel/.test(evidenceStatus({ ...toApproved(base[0]), sourceKind: "recibo_papel" })));
check("export: single review is stated", /revisión por una sola persona/.test(csv));
check("export: decision and reason travel with the row", /aceptar \(en bloque\),confirmado con la ficha técnica/.test(csv));
const log = decisionLogCsv([...decisions.values()].map((d) => ({ cycleName: "Ciclo 2", key: d.key, choice: d.choice, reason: d.reason, bulk: d.bulk, at: "2026-10-24T10:30:00Z", singleReview: true })));
check("export: decision log has all 13", log.trim().split("\r\n").length === 14);
check("export: no forbidden claim anywhere", scanWording(csv + log).length === 0);
check("export: CSV escapes commas and quotes", evidenceCsv([{ ...comps[0], approved: { ...comps[0].approved, component: 'Tapa "grande", azul' } }]).includes('"Tapa ""grande"", azul"'));

// ------------------------------------------------------------ wording scan
check("wording: catches the claims it must catch", scanWording("Reciclado verificado").length === 1 && scanWording("impacto ambiental positivo").length === 1 && scanWording("beneficia a los recolectores").length === 1 && scanWording("calificación del proveedor").length === 1);
check("wording: allows the honest wording", scanWording("sin sustento; referencia declarada por el proveedor, no verificada por Cuadre").length === 0);
{
  const roots = ["app", "components", "lib", "supabase"];
  const skip = new Set(["wording.ts"]);
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (/\.(ts|tsx|sql|md)$/.test(f.name) && !skip.has(f.name)) {
        const t = fs.readFileSync(p, "utf8");
        const h = scanWording(t);
        if (h.length) hits.push(`${p}: ${h.join(", ")}`);
      }
    }
  };
  roots.forEach((r) => fs.existsSync(r) && walk(r));
  check("source tree: no forbidden environmental or worker claims" + (hits.length ? " " + hits.join("; ") : ""), hits.length === 0);
  const schema = fs.existsSync("supabase/schema.sql") ? fs.readFileSync("supabase/schema.sql", "utf8") : "";
  check("schema: no score, rating or worker column", schema === "" || !/(score|rating|calificacion|puntaje|worker|collector|recolector|pepenador)/i.test(schema.replace(/--.*$/gm, "")));
  check("schema: RLS enabled on every table", schema === "" || ((schema.match(/create table public\./g) ?? []).length === (schema.match(/enable row level security/g) ?? []).length));
  check("schema: versions and decisions have no update or delete policy", schema === "" || !/on public\.(versions|decisions) for (update|delete)/i.test(schema));
}

// ------------------------------------------------------------ AI output handling (no network)
{
  const text = "Ficha del proveedor Envases Delta. Botella de PET para limpiador LIM-500, peso 21.0 g, contenido reciclado 0%.";
  const good = parseAiRows(JSON.stringify({ rows: [{ sku: "LIM-500", component: "Botella", material: "PET", weightG: 21, recycledPct: 0, supplier: "Envases Delta", evidenceRef: null, quote: "Botella de PET para limpiador LIM-500, peso 21.0 g, contenido reciclado 0%" }] }));
  check("ai: well-formed output parses", good !== null && good.length === 1);
  const chk = checkAiRows(good!, text);
  check("ai: row with a verbatim quote and numbers inside it is kept", chk.kept.length === 1 && chk.dropped.length === 0);
  const fake = parseAiRows(JSON.stringify({ rows: [{ sku: "LIM-500", component: "Botella", material: "PET", weightG: 21, recycledPct: 0, supplier: "Envases Delta", evidenceRef: null, quote: "La botella pesa 21 gramos y es 100% reciclada" }] }));
  check("ai: quote not found in the text is discarded", checkAiRows(fake!, text).kept.length === 0 && checkAiRows(fake!, text).dropped.length === 1);
  const wrongNum = parseAiRows(JSON.stringify({ rows: [{ sku: "LIM-500", component: "Botella", material: "PET", weightG: 25, recycledPct: 0, supplier: "Envases Delta", evidenceRef: null, quote: "Botella de PET para limpiador LIM-500, peso 21.0 g" }] }));
  check("ai: a number that is not in its own quote is discarded", checkAiRows(wrongNum!, text).kept.length === 0);
  check("ai: quote check ignores case and extra spaces", checkAiRows(good!.map((r) => ({ ...r, quote: "botella  de PET para limpiador   LIM-500, peso 21.0 g, contenido reciclado 0%" })), text).kept.length === 1);
  const emptyQuote = parseAiRows(JSON.stringify({ rows: [{ sku: "A", component: "B", material: "PP", weightG: 1, recycledPct: null, supplier: "S", evidenceRef: null, quote: "" }] }));
  check("ai: empty quote is discarded", checkAiRows(emptyQuote!, text).kept.length === 0);
  check("ai: malformed output is rejected", parseAiRows("not json") === null && parseAiRows(JSON.stringify({ rows: "x" })) === null && parseAiRows(JSON.stringify([1, 2])) === null);
  check("ai: code fences are tolerated", parseAiRows("```json\n" + JSON.stringify({ rows: [] }) + "\n```")?.length === 0);
  check("ai: more than 40 rows are cut", (parseAiRows(JSON.stringify({ rows: Array.from({ length: 60 }, () => ({ sku: "A", component: "B", material: "PP", weightG: 1, recycledPct: null, supplier: "S", evidenceRef: null, quote: "x" })) }))?.length ?? 0) === 40);
  const ph = parsePhoto(JSON.stringify({ material: "PET", weightG: 21, quote: "PET 1  21 g" }));
  check("ai: photo proposal parses into a draft, never into a decision", ph !== null && ph.material === "PET" && ph.weightG === 21);
  check("ai: photo output with an unknown material becomes null, not a guess", parsePhoto(JSON.stringify({ material: "Plastiquito", weightG: 5, quote: "q" }))?.material === null);
  check("ai: nothing proposed by a model is ever marked confirmed", good!.every((r) => !("confirmed" in r)));
}

// ------------------------------------------------------------ baseline csv sanity
check("simfeed: baseline CSV text round-trips through the parser", (() => { const r = parseCsv(simBaselineCsv(), { fileName: "x", origin: "simulated" }); return r.ok && r.rows.length === 31; })());

if (fails.length) {
  console.error(`FAILED ${fails.length} of ${pass + fails.length} checks:`);
  fails.forEach((f) => console.error(" - " + f));
  process.exit(1);
}
console.log(`ok: ${pass} checks passed`);

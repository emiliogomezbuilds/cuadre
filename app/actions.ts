"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CONSENT_VERSION, requireUser } from "@/lib/session";
import { num, text, uuid } from "@/lib/validate";
import { MAX_BYTES, parseCsv, parseKind } from "@/lib/parse";
import { loadCycle } from "@/lib/data";
import { bulkEligible, planApproval, validateDecision, type Decision } from "@/lib/decisions";
import { CHOICES, MATERIALS, type Choice, type InRow, type Origin } from "@/lib/types";
import { SIM_BASELINE_FILE, SIM_UPDATE_FILE, simBaselineCsv, simUpdateCsv } from "@/lib/simfeed";
import { AI_DAILY_LIMIT, AI_IMAGE_MAX_BYTES, AI_TEXT_MAX, IMAGE_TYPES, draftFromPhoto, rowsFromText } from "@/lib/ai";
import { checkAiRows, type AiRow } from "@/lib/ai-parse";

type Ctx = Awaited<ReturnType<typeof requireUser>>;
export type ActionState = { error?: string; ok?: string };

// ------------------------------------------------------------------ helpers
async function draftCycle(ctx: Ctx, fd: FormData) {
  const id = uuid(fd.get("cycle_id"));
  if (!id) return { error: "Ciclo no válido." as const };
  const st = await loadCycle(ctx.supabase, id);
  if (!st) return { error: "No encontramos ese ciclo." as const };
  if (st.cycle.status !== "draft") return { error: "Este ciclo ya está aprobado y no se puede cambiar." as const };
  return { st, id };
}

async function insertRows(ctx: Ctx, cycleId: string, rows: InRow[]) {
  if (rows.length === 0) return { error: "No hay filas para importar." };
  const payload = rows.map((r) => ({
    cycle_id: cycleId, sku: r.sku, component: r.component, material: r.material, weight_g: r.weightG, recycled_pct: r.recycledPct,
    supplier: r.supplier, evidence_ref: r.evidenceRef, source_kind: r.sourceKind, source_file: r.sourceFile.slice(0, 120),
    source_line: r.sourceLine, origin: r.origin, quote: r.quote ?? null, bad: r.bad,
  }));
  for (let i = 0; i < payload.length; i += 200) {
    const { error } = await ctx.supabase.from("rows").insert(payload.slice(i, i + 200));
    if (error) return { error: "No se pudieron guardar las filas. Intenta de nuevo." };
  }
  await ctx.supabase.from("cycles").update({ first_import_at: new Date().toISOString() }).eq("id", cycleId).is("first_import_at", null);
  return {};
}

async function aiAllowed(ctx: Ctx) {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await ctx.supabase.from("consents").select("id", { count: "exact", head: true }).in("purpose", ["ai_text", "ai_photo"]).gte("created_at", since);
  return (count ?? 0) < AI_DAILY_LIMIT;
}
const logConsent = (ctx: Ctx, purpose: "ai_text" | "ai_photo" | "process_data") =>
  ctx.supabase.from("consents").insert({ purpose, granted: true, text_version: CONSENT_VERSION });

const aiErrorMessage = (e: { error: string; status?: number }) =>
  e.error === "no_key" ? "La ayuda con IA no está configurada en este servidor. Importa un CSV o usa la alimentación simulada: Cuadre funciona igual."
  : e.error === "too_long" ? `El texto es muy largo (máximo ${AI_TEXT_MAX} caracteres).`
  : e.error === "bad_output" ? "La IA no devolvió algo que pudiéramos usar. Importa un CSV."
  : `La IA no estuvo disponible ahora${e.status ? ` (código ${e.status})` : ""}. Importa un CSV: Cuadre funciona igual.`;

// ------------------------------------------------------------------ cycles
export async function createCycleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireUser();
  const name = text(fd.get("name"), 1, 60);
  if (!name) return { error: "Escribe un nombre para el ciclo (hasta 60 caracteres), por ejemplo «2026 T4»." };
  const { data: last } = await ctx.supabase.from("cycles").select("number").order("number", { ascending: false }).limit(1).maybeSingle();
  const number = (last?.number ?? 0) + 1;
  if (number > 99) return { error: "Llegaste al máximo de ciclos de la demostración." };
  const { data, error } = await ctx.supabase.from("cycles").insert({ name, number }).select("id").single();
  if (error || !data) return { error: "No se pudo crear el ciclo. Intenta de nuevo." };
  revalidatePath("/dashboard");
  redirect(`/ciclos/${data.id}`);
}

// ------------------------------------------------------------------ imports (CSV, labeled simulated feed)
export async function importCsvAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireUser();
  const c = await draftCycle(ctx, fd);
  if ("error" in c) return { error: c.error };
  const file = fd.get("file");
  const pasted = fd.get("csv_text");
  let body = "";
  let fileName = "pegado.csv";
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return { error: "El archivo pesa más de 1 MB." };
    body = await file.text();
    fileName = file.name.slice(0, 100);
  } else if (typeof pasted === "string" && pasted.trim()) {
    body = pasted;
  } else return { error: "Elige un archivo CSV o pega su contenido." };
  const parsed = parseCsv(body, { fileName, origin: "csv" });
  if (!parsed.ok) return { error: parsed.error };
  const ins = await insertRows(ctx, c.id, parsed.rows);
  if (ins.error) return { error: ins.error };
  revalidatePath(`/ciclos/${c.id}`);
  return { ok: `Se importaron ${parsed.rows.length} filas de ${fileName}.` };
}

export async function simFeedAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireUser();
  const c = await draftCycle(ctx, fd);
  if ("error" in c) return { error: c.error };
  const which = fd.get("which");
  const baseline = which === "baseline";
  if (!baseline && which !== "update") return { error: "Opción no válida." };
  const parsed = parseCsv(baseline ? simBaselineCsv() : simUpdateCsv(), { fileName: baseline ? SIM_BASELINE_FILE : SIM_UPDATE_FILE, origin: "simulated" });
  if (!parsed.ok) return { error: parsed.error };
  const ins = await insertRows(ctx, c.id, parsed.rows);
  if (ins.error) return { error: ins.error };
  await ctx.supabase.from("cycles").update({ simulated: true }).eq("id", c.id);
  revalidatePath(`/ciclos/${c.id}`);
  return { ok: `Se cargaron ${parsed.rows.length} filas SIMULADAS (datos inventados).` };
}

export async function clearRowsAction(fd: FormData) {
  const ctx = await requireUser();
  const c = await draftCycle(ctx, fd);
  if ("error" in c) redirect("/dashboard");
  await ctx.supabase.from("rows").delete().eq("cycle_id", c.id);
  revalidatePath(`/ciclos/${c.id}`);
  redirect(`/ciclos/${c.id}`);
}

// ------------------------------------------------------------------ decisions (the server recomputes, the browser is never trusted)
function decisionFrom(fd: FormData, key: string): { d: Decision } | { error: string } {
  const choice = String(fd.get("choice") ?? "");
  if (!(CHOICES as readonly string[]).includes(choice)) return { error: "Elige una opción: nada viene marcado de antemano." };
  const reason = text(fd.get("reason"), 0, 300) ?? "";
  const pickRaw = fd.get("pick");
  const pick = typeof pickRaw === "string" && pickRaw !== "" ? Number(pickRaw) : null;
  if (pick !== null && !Number.isInteger(pick)) return { error: "Elección no válida." };
  return { d: { key, choice: choice as Choice, reason, pick, bulk: false } };
}

export async function decideAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireUser();
  const c = await draftCycle(ctx, fd);
  if ("error" in c) return { error: c.error };
  const key = text(fd.get("key"), 1, 120);
  const ex = c.st.rec.exceptions.find((e) => e.key === key);
  if (!key || !ex) return { error: "Esa excepción ya no existe. Recarga la página." };
  const r = decisionFrom(fd, key);
  if ("error" in r) return { error: r.error };
  const err = validateDecision(ex, r.d);
  if (err) return { error: err };
  const { error } = await ctx.supabase.from("decisions").insert({ cycle_id: c.id, key, choice: r.d.choice, reason: r.d.reason.trim(), pick: r.d.pick, bulk: false });
  if (error) return { error: "No se pudo guardar la decisión. Intenta de nuevo." };
  revalidatePath(`/ciclos/${c.id}`);
  return { ok: "Decisión guardada." };
}

export async function bulkDecideAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireUser();
  const c = await draftCycle(ctx, fd);
  if ("error" in c) return { error: c.error };
  const reason = text(fd.get("reason"), 5, 300);
  if (!reason) return { error: "Escribe un motivo compartido de 5 a 300 caracteres." };
  if (fd.get("confirm_bulk") !== "on") return { error: "Marca la casilla para confirmar que revisaste esos cambios menores." };
  const targets = c.st.rec.exceptions.filter((e) => bulkEligible(e) && !c.st.decisions.has(e.key));
  if (targets.length === 0) return { error: "No hay cambios menores pendientes." };
  const payload = targets.map((e) => ({ cycle_id: c.id, key: e.key, choice: "accept_new" as Choice, reason, pick: null, bulk: true }));
  const { error } = await ctx.supabase.from("decisions").insert(payload);
  if (error) return { error: "No se pudieron guardar las decisiones. Intenta de nuevo." };
  revalidatePath(`/ciclos/${c.id}`);
  return { ok: `Se aceptaron ${targets.length} cambios menores en bloque, con tu motivo.` };
}

// ------------------------------------------------------------------ approval (appends versions; never edits or deletes one)
export async function approveAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireUser();
  const c = await draftCycle(ctx, fd);
  if ("error" in c) return { error: c.error };
  if (fd.get("confirm_approve") !== "on") return { error: "Marca la casilla para confirmar la aprobación." };
  if (c.st.rowCount === 0) return { error: "Este ciclo no tiene filas." };
  let plan;
  try {
    plan = planApproval(c.st.rec, c.st.incoming, c.st.decisions);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo aprobar." };
  }
  if (plan.versions.length) {
    const payload = plan.versions.map((v) => ({
      cycle_id: c.id, key: v.key, sku: v.sku, component: v.component, version: v.version, removed: v.removed, snapshot: v.values, decision_key: v.decisionKey,
    }));
    for (let i = 0; i < payload.length; i += 200) {
      const { error } = await ctx.supabase.from("versions").insert(payload.slice(i, i + 200));
      if (error) return { error: "No se pudieron guardar las versiones. Nada se aprobó; intenta de nuevo." };
    }
  }
  const { error } = await ctx.supabase.from("cycles").update({ status: "approved", approved_at: new Date().toISOString(), approved_single_review: true }).eq("id", c.id);
  if (error) return { error: "Las versiones se guardaron pero no se pudo marcar el ciclo como aprobado. Recarga la página." };
  revalidatePath(`/ciclos/${c.id}`);
  revalidatePath("/dashboard");
  redirect(`/ciclos/${c.id}`);
}

// ------------------------------------------------------------------ AI proposals (optional; the model proposes, a person confirms every row)
export type AiTextState = { error?: string; rows?: AiRow[]; dropped?: Array<{ sku: string; component: string; reason: string }>; text?: string };

export async function aiTextProposeAction(_p: AiTextState, fd: FormData): Promise<AiTextState> {
  const ctx = await requireUser();
  const c = await draftCycle(ctx, fd);
  if ("error" in c) return { error: c.error };
  if (fd.get("consent_ai") !== "on") return { error: "Para usar la ayuda con IA necesitamos tu permiso. Marca la casilla." };
  const t = text(fd.get("free_text"), 20, AI_TEXT_MAX);
  if (!t) return { error: `Pega entre 20 y ${AI_TEXT_MAX} caracteres de texto del proveedor.` };
  if (!(await aiAllowed(ctx))) return { error: "Llegaste al límite diario de ayuda con IA. Importa un CSV." };
  await logConsent(ctx, "ai_text");
  const res = await rowsFromText(t);
  if (!res.ok) return { error: aiErrorMessage(res) };
  return { rows: res.value.kept, dropped: res.value.dropped.map((d) => ({ sku: d.row.sku, component: d.row.component, reason: d.reason })), text: t };
}

export async function aiTextConfirmAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireUser();
  const c = await draftCycle(ctx, fd);
  if ("error" in c) return { error: c.error };
  const t = text(fd.get("free_text"), 20, AI_TEXT_MAX);
  if (!t) return { error: "Falta el texto original. Vuelve a empezar." };
  let proposed: AiRow[] = [];
  try {
    const raw = String(fd.get("rows_json") ?? "");
    if (raw.length > 60_000) return { error: "Demasiadas filas." };
    proposed = JSON.parse(raw) as AiRow[];
  } catch { return { error: "No se pudieron leer las filas propuestas." }; }
  if (!Array.isArray(proposed)) return { error: "No se pudieron leer las filas propuestas." };
  const out: InRow[] = [];
  for (let i = 0; i < proposed.length; i++) {
    if (fd.get(`confirm_${i}`) !== "on") continue; // only rows she explicitly confirmed
    const kind = parseKind(String(fd.get(`kind_${i}`) ?? ""));
    if (!kind) return { error: `Elige el tipo de fuente de la fila ${i + 1}: nada viene elegido de antemano.` };
    const p = proposed[i];
    const re = checkAiRows([p], t); // the browser is not trusted: re-check the quote on the server
    if (re.kept.length !== 1) return { error: `La fila ${i + 1} no pasa la revisión de la cita. Vuelve a proponer.` };
    const k = re.kept[0];
    out.push({
      sku: k.sku, component: k.component, material: k.material ?? "", weightG: k.weightG, recycledPct: k.recycledPct, supplier: k.supplier,
      evidenceRef: k.evidenceRef, sourceKind: kind, sourceFile: "IA desde texto pegado", sourceLine: i + 1, origin: "ai_text" as Origin, quote: k.quote, bad: [],
    });
  }
  if (out.length === 0) return { error: "No confirmaste ninguna fila." };
  const ins = await insertRows(ctx, c.id, out);
  if (ins.error) return { error: ins.error };
  revalidatePath(`/ciclos/${c.id}`);
  return { ok: `Se agregaron ${out.length} filas que confirmaste una por una.` };
}

export type AiPhotoState = { error?: string; draft?: { material: string | null; weightG: number | null; quote: string } };

export async function aiPhotoProposeAction(_p: AiPhotoState, fd: FormData): Promise<AiPhotoState> {
  const ctx = await requireUser();
  const c = await draftCycle(ctx, fd);
  if ("error" in c) return { error: c.error };
  if (fd.get("consent_ai") !== "on") return { error: "Para leer la foto necesitamos tu permiso. Marca la casilla." };
  const file = fd.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige una foto de la etiqueta." };
  if (file.size > AI_IMAGE_MAX_BYTES) return { error: "La imagen pesa más de 4 MB." };
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return { error: "Solo aceptamos imágenes PNG, JPG o WebP." };
  if (!(await aiAllowed(ctx))) return { error: "Llegaste al límite diario de ayuda con IA." };
  await logConsent(ctx, "ai_photo");
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64"); // processed in memory, never stored
  const res = await draftFromPhoto(file.type, b64);
  return res.ok ? { draft: res.value } : { error: aiErrorMessage(res) };
}

export async function aiPhotoConfirmAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireUser();
  const c = await draftCycle(ctx, fd);
  if ("error" in c) return { error: c.error };
  if (fd.get("confirm_photo") !== "on") return { error: "Marca la casilla para confirmar que revisaste estos datos." };
  const sku = text(fd.get("sku"), 1, 40);
  const component = text(fd.get("component"), 1, 60);
  const supplier = text(fd.get("supplier"), 1, 80);
  const material = String(fd.get("material") ?? "");
  const weight = num(fd.get("weight_g"), 0.01, 5000);
  const kind = parseKind(String(fd.get("kind") ?? ""));
  if (!sku || !component || !supplier) return { error: "Escribe el SKU, el componente y el proveedor: la foto no los puede decir." };
  if (!(MATERIALS as readonly string[]).includes(material)) return { error: "Elige el material." };
  if (weight === null) return { error: "Escribe el peso en gramos (entre 0.01 y 5000)." };
  if (!kind) return { error: "Elige el tipo de fuente: nada viene elegido de antemano." };
  const row: InRow = {
    sku: sku.toUpperCase(), component, material, weightG: weight, recycledPct: null, supplier, evidenceRef: null, sourceKind: kind,
    sourceFile: "IA desde foto de etiqueta", sourceLine: 1, origin: "ai_photo", quote: text(fd.get("quote"), 0, 200), bad: [],
  };
  const ins = await insertRows(ctx, c.id, [row]);
  if (ins.error) return { error: ins.error };
  revalidatePath(`/ciclos/${c.id}`);
  return { ok: "Fila agregada desde la foto, con los datos que confirmaste." };
}

// ------------------------------------------------------------------ deletion
export async function deleteAllDataAction() {
  const { supabase, user } = await requireUser();
  await supabase.from("cycles").delete().eq("user_id", user.id); // cascades to rows, decisions and versions
  await supabase.from("consents").delete().eq("user_id", user.id);
  revalidatePath("/dashboard");
  redirect("/dashboard?deleted=1");
}


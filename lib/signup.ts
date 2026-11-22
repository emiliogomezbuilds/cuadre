// Pure validation for the Week 15 capture form (docs/PACKET.md). No I/O, no Supabase — kept separate from
// app/actions.ts so it can be offline-tested the same way lib/decisions.ts and lib/pricing.ts already are.
import { text } from "@/lib/validate";

export type SignupSource = "linkedin_cold" | "other";

export interface SignupInput {
  name: string;
  contact: string;
  role_title: string | null;
  message: string | null;
  source: SignupSource;
}

export type SignupResult = { ok: true; data: SignupInput } | { ok: false; error: string };

function optionalText(v: unknown, max: number, tooLongError: string): { ok: true; value: string | null } | { ok: false; error: string } {
  if (v === null || v === undefined || String(v).trim() === "") return { ok: true, value: null };
  const t = text(v, 1, max);
  if (t === null) return { ok: false, error: tooLongError };
  return { ok: true, value: t };
}

// `source` is never trusted from a free-text field a visitor could type into — the page sets it from its own
// URL, and anything other than the one real tagged value collapses to "other" rather than failing or guessing.
export function parseSignupInput(fd: { get(k: string): FormDataEntryValue | null }): SignupResult {
  const name = text(fd.get("name"), 1, 80);
  if (!name) return { ok: false, error: "Escribe tu nombre (hasta 80 caracteres)." };

  const contact = text(fd.get("contact"), 3, 120);
  if (!contact) return { ok: false, error: "Escribe cómo contactarte (correo o WhatsApp)." };

  const role = optionalText(fd.get("role_title"), 80, "El rol es demasiado largo (máximo 80 caracteres).");
  if (!role.ok) return role;

  const message = optionalText(fd.get("message"), 300, "El mensaje es demasiado largo (máximo 300 caracteres).");
  if (!message.ok) return message;

  const sourceRaw = String(fd.get("source") ?? "");
  const source: SignupSource = sourceRaw === "linkedin_cold" ? "linkedin_cold" : "other";

  return { ok: true, data: { name, contact, role_title: role.value, message: message.value, source } };
}

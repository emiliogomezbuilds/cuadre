// Pricing logic for Cuadre's scoped-cycle offer (docs/PACKET.md, Week 14). Pure functions, no I/O, no AI.
//
// Deliberate design, from this week's Brain Bending fight (CHAT_EmilioGomez.pdf): the value Cuadre protects is
// event-driven (an avoided held shipment, an avoided costly mismatch), not a steady habit, so price is banded by
// the declared value at risk in a cycle, not by how often someone runs a cycle. Two importers running the same
// number of cycles a year but reconciling very different shipment values should not pay the same price — that
// would be SaaS-shaped pricing wearing a different unit, the exact mistake the fight corrected twice.
//
// The MXN 2,000 base anchor is explicitly a deliberately round test number (not derived from any user's reported
// incident cost — see DECISIONS.md and BRIEF_EmilioGomez.pdf, Week 14) and is disclosed as such everywhere it
// appears in the product, not just here.

export type Segment = "export" | "domestic";
export const SEGMENT_LABEL: Record<Segment, string> = {
  export: "Enfocado a exportación (UE/California ya exigen documentación)",
  domestic: "Solo mercado nacional (sin obligación mexicana publicada todavía)",
};

export interface Band {
  id: string;
  label: string;
  maxDeclaredValueMXN: number | null; // null = no upper bound
  priceMXNPerCycle: number;
}

// The base anchor. Every other band is a deliberate multiple of it, not an independently invented number.
export const BASE_ANCHOR_MXN = 2000;

export const BANDS: Band[] = [
  { id: "low", label: "Hasta MXN 500,000 declarados por ciclo", maxDeclaredValueMXN: 500_000, priceMXNPerCycle: BASE_ANCHOR_MXN },
  { id: "mid", label: "MXN 500,000 — 2,000,000 declarados por ciclo", maxDeclaredValueMXN: 2_000_000, priceMXNPerCycle: BASE_ANCHOR_MXN * 2.25 },
  { id: "high", label: "Más de MXN 2,000,000 declarados por ciclo", maxDeclaredValueMXN: null, priceMXNPerCycle: BASE_ANCHOR_MXN * 4.5 },
];

export function bandForDeclaredValue(declaredValueMXN: number): Band {
  for (const b of BANDS) {
    if (b.maxDeclaredValueMXN === null || declaredValueMXN <= b.maxDeclaredValueMXN) return b;
  }
  return BANDS[BANDS.length - 1];
}

export function bandById(id: string): Band | null {
  return BANDS.find((b) => b.id === id) ?? null;
}

export interface ScenarioInput {
  segment: Segment;
  bandId: string;
  customers: number; // number of paying companies
  cyclesPerCustomerPerYear: number;
}

export interface ScenarioProjection {
  pricePerCycleMXN: number;
  annualMXN: number;
  monthlyMXN: number;
}

// Same bounds as the scenarios table's own check constraints (supabase/schema.sql). A save was always rejected
// past these limits; the live simulator was not, so typing an unrealistic number (Week 14 Persona pass, live on
// cuadre.dev: 999,999,999 clients) produced an absurd on-screen projection with no guardrail. Clamping here means
// the number shown and the number a save would accept are always the same number, not two different promises.
const MAX_CUSTOMERS = 100_000;
const MAX_CYCLES_PER_YEAR = 1_000;

export function projectRevenue(input: ScenarioInput): ScenarioProjection {
  const band = bandById(input.bandId) ?? BANDS[0];
  const customers = Math.min(MAX_CUSTOMERS, Math.max(0, Math.floor(input.customers)));
  const cycles = Math.min(MAX_CYCLES_PER_YEAR, Math.max(0, input.cyclesPerCustomerPerYear));
  const annualMXN = customers * cycles * band.priceMXNPerCycle;
  return {
    pricePerCycleMXN: band.priceMXNPerCycle,
    annualMXN,
    monthlyMXN: annualMXN / 12,
  };
}

export const ANCHOR_DISCLOSURE =
  "MXN 2,000 por ciclo (banda base) es un número de prueba, redondo a propósito. No se deriva de ningún incidente reportado por un usuario real; lo decimos así a cada posible pagador antes de preguntar si pagaría.";

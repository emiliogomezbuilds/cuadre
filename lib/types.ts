// Shared types and fixed lists. Material categories are INTERNAL to Cuadre: the Mexican reglamento that
// would define official categories was unpublished in the sources I read (see docs/PACKET.md).

export const MATERIALS = ["PET", "PEAD", "PVC", "PEBD", "PP", "PS", "Vidrio", "Aluminio", "Acero", "Carton", "Papel", "Multicapa", "Otro"] as const;
export type Material = (typeof MATERIALS)[number];

export const SOURCE_KINDS = ["ficha_tecnica", "declaracion_proveedor", "estimacion", "recibo_papel"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  ficha_tecnica: "Ficha técnica del proveedor",
  declaracion_proveedor: "Declaración del proveedor",
  estimacion: "Estimación",
  recibo_papel: "Recibo o documento en papel",
};

export type Origin = "csv" | "simulated" | "ai_text" | "ai_photo";
export const ORIGIN_LABEL: Record<Origin, string> = {
  csv: "Archivo CSV",
  simulated: "SIMULADO",
  ai_text: "Propuesto por IA desde texto, confirmado",
  ai_photo: "Propuesto por IA desde foto, confirmado",
};

/** One incoming packaging row (a component of a SKU), as parsed. Values may be invalid; the engine says why. */
export interface InRow {
  sku: string;
  component: string;
  material: string; // raw text, checked against MATERIALS by the engine
  weightG: number | null;
  recycledPct: number | null;
  supplier: string;
  evidenceRef: string | null;
  sourceKind: SourceKind | null;
  sourceFile: string;
  sourceLine: number;
  origin: Origin;
  quote?: string | null;
  bad: string[]; // field names whose text was present but not a valid number or allowed value
}

/** The approved value of a component in the baseline (latest version). */
export interface Approved {
  sku: string;
  component: string;
  material: string;
  weightG: number | null;
  recycledPct: number | null;
  supplier: string;
  evidenceRef: string | null;
  sourceKind: SourceKind | null;
  origin: Origin;
  sourceFile: string;
  sourceLine: number;
  version: number;
}

export type Choice = "accept_new" | "keep_previous" | "request_supplier" | "reject_row";
export const CHOICES: readonly Choice[] = ["accept_new", "keep_previous", "request_supplier", "reject_row"];

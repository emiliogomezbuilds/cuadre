// The labeled SIMULATED supplier feed (Dragon Stack: sensing, simulated and labeled). Everything here is invented:
// a fictional company, fictional suppliers and fictional documents. Every row it produces carries origin
// "simulated" and shows "SIMULADO" on screen and in the export. It is never presented as real data.
import { parseCsv } from "@/lib/parse";

export const SIM_COMPANY = "Hogar Claro (empresa inventada)";
export const SIM_BASELINE_FILE = "SIMULADO · ciclo1_inventado.csv";
export const SIM_UPDATE_FILE = "SIMULADO · ciclo2_inventado.csv";

const H = "sku,componente,material,peso_g,reciclado_pct,proveedor,evidencia,fuente_tipo";
const ED = "Envases Delta", PN = "Plásticos Norte", EV = "Etiquetas del Valle", CA = "Cartones Aurora", VC = "Vidrios del Centro", MS = "Metales Sur";
const F = "ficha_tecnica", D = "declaracion_proveedor";

// sku, componente, material, peso_g, reciclado_pct, proveedor, evidencia, fuente_tipo
type R = [string, string, string, string, string, string, string, string];
const BASE: R[] = [
  ["LIM-500", "Botella", "PET", "24.0", "0", ED, "", F],
  ["LIM-500", "Tapa", "PP", "3.2", "0", PN, "", F],
  ["LIM-500", "Etiqueta", "Papel", "1.8", "0", EV, "", F],
  ["LIM-500", "Caja colectiva", "Carton", "45.0", "70", CA, "CERT-CA-2201", D],
  ["LIM-1L", "Botella", "PET", "38.0", "0", ED, "", F],
  ["LIM-1L", "Tapa", "PP", "3.4", "0", PN, "", F],
  ["LIM-1L", "Etiqueta", "Papel", "2.2", "0", EV, "", F],
  ["DET-1L", "Botella", "PEAD", "52.0", "0", ED, "", F],
  ["DET-1L", "Tapa", "PP", "4.0", "0", PN, "", F],
  ["DET-1L", "Etiqueta", "Papel", "2.1", "0", EV, "", F],
  ["DET-3L", "Garrafa", "PEAD", "110.0", "25", ED, "ED-REC-009", D],
  ["DET-3L", "Tapa", "PP", "5.5", "0", PN, "", F],
  ["DET-3L", "Etiqueta", "Papel", "2.8", "0", EV, "", F],
  ["DES-500", "Lata", "Acero", "68.0", "30", MS, "MS-C-14", D],
  ["DES-500", "Tapa", "PP", "4.5", "0", PN, "", F],
  ["SUA-900", "Botella", "PET", "42.0", "20", ED, "ED-REC-011", D],
  ["SUA-900", "Tapa", "PP", "3.8", "0", PN, "", F],
  ["SUA-900", "Etiqueta", "Papel", "2.0", "0", EV, "", F],
  ["SUA-2L", "Botella", "PEAD", "46.0", "0", ED, "", F],
  ["SUA-2L", "Tapa", "PP", "4.4", "0", PN, "", F],
  ["SUA-2L", "Etiqueta", "Papel", "2.6", "0", EV, "", F],
  ["VID-250", "Frasco", "Vidrio", "180.0", "40", VC, "VC-77", D],
  ["VID-250", "Tapa", "Aluminio", "6.0", "0", MS, "", F],
  ["CAJ-12", "Caja", "Carton", "120.0", "70", CA, "CERT-CA-2201", D],
  ["JAB-300", "Envoltura", "Papel", "5.0", "0", EV, "", F],
  ["JAB-300", "Caja", "Carton", "22.0", "0", CA, "", F],
  ["GEL-250", "Frasco", "PET", "20.0", "0", ED, "", F],
  ["GEL-250", "Tapa", "PP", "2.8", "0", PN, "", F],
  ["GEL-250", "Etiqueta", "Papel", "1.5", "0", EV, "", F],
  ["AMB-400", "Lata", "Aluminio", "14.0", "0", MS, "", F],
  ["AMB-400", "Tapa", "PP", "3.0", "0", PN, "", F],
];

const csv = (rows: R[]) => [H, ...rows.map((r) => r.join(","))].join("\n") + "\n";
const at = (rows: R[], sku: string, comp: string) => rows.find((r) => r[0] === sku && r[1] === comp)!;

/** Cycle 2: revisions that exercise every exception kind (large and minor changes, unsupported claim, paper source,
 * possible double counting, conflict, missing value, removal, new SKU). */
function update(): R[] {
  const rows: R[] = BASE.map((r) => [...r] as R);
  at(rows, "LIM-500", "Botella")[3] = "21.0"; // large weight change (-12.5 percent)
  const tapa = at(rows, "DET-1L", "Tapa"); tapa[4] = "30"; // recycled claim with no evidence reference
  at(rows, "SUA-900", "Botella")[5] = PN; // supplier change
  const frasco = at(rows, "VID-250", "Frasco"); frasco[6] = "ED-REC-009"; // same reference cited by a different supplier and material
  at(rows, "AMB-400", "Lata")[3] = ""; // missing weight
  at(rows, "SUA-2L", "Botella")[3] = "45.2"; // minor change
  at(rows, "DET-3L", "Tapa")[3] = "5.6"; // minor change
  const jab = rows.findIndex((r) => r[0] === "JAB-300" && r[1] === "Caja");
  rows.splice(jab, 1); // removed component
  const gel = rows.findIndex((r) => r[0] === "GEL-250" && r[1] === "Tapa");
  rows.splice(gel + 1, 0, ["GEL-250", "Tapa", "PP", "3.1", "0", PN, "", F]); // conflicting duplicate
  rows.push(["DET-1L", "Sello", "Papel", "0.6", "0", EV, "", "recibo_papel"]); // new component from a paper receipt
  rows.push(["LIM-250", "Botella", "PET", "16.0", "0", ED, "", F], ["LIM-250", "Tapa", "PP", "2.6", "0", PN, "", F], ["LIM-250", "Etiqueta", "Papel", "1.5", "0", EV, "", F]);
  return rows;
}

export const simBaselineCsv = () => csv(BASE);
export const simUpdateCsv = () => csv(update());

export function simBaselineRows() {
  const r = parseCsv(simBaselineCsv(), { fileName: SIM_BASELINE_FILE, origin: "simulated" });
  if (!r.ok) throw new Error(r.error);
  return r.rows;
}
export function simUpdateRows() {
  const r = parseCsv(simUpdateCsv(), { fileName: SIM_UPDATE_FILE, origin: "simulated" });
  if (!r.ok) throw new Error(r.error);
  return r.rows;
}

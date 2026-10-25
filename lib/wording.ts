// Shadow clause as a build rule. These phrases may not appear in any text Cuadre shows or exports: an
// evidence reference is never presented as verified recycling, and nothing speaks about collectors or workers.
export const FORBIDDEN_CLAIMS: Array<[RegExp, string]> = [
  [/reciclado\s+verificado/i, "verified recycling claim"],
  [/recuperaci[oó]n\s+verificada/i, "verified recovery claim"],
  [/impacto\s+ambiental\s+(positivo|medido|verificado)/i, "environmental impact claim"],
  [/100\s*%\s*reciclable/i, "recyclability claim"],
  [/(mejora|beneficia|empodera)\w*\s+a\s+(las\s+|los\s+)?(personas\s+)?(recolector|pepenador|trabajador)/i, "worker benefit claim"],
  [/calificaci[oó]n\s+(del\s+)?proveedor/i, "supplier score"],
];

export function scanWording(text: string): string[] {
  const hits: string[] = [];
  for (const [re, label] of FORBIDDEN_CLAIMS) if (re.test(text)) hits.push(label);
  return hits;
}

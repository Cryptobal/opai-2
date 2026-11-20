/** Patrones de lenguaje interno que no debe aparecer en textos visibles para tenants ni agentes (CAR-579). */
const PATRONES: readonly { id: string; re: RegExp }[] = [
  { id: "carlos", re: /\bCarlos\b/i },
  { id: "gard", re: /\bGard\b/i },
  { id: "decision_de", re: /decisión de/i },
  { id: "adr", re: /ADR-\d+/i },
  { id: "car", re: /CAR-\d+/i },
  { id: "pr_dev", re: /\bPR \d+\b/ },
  { id: "brief", re: /\bBRIEF[-\s]|\bbrief\b/i },
  { id: "ola", re: /\bola \d/i },
  { id: "sesion_encargo", re: /\[Sesión /i },
  { id: "opai1", re: /OPAI 1\.0|OPAI 1\b/i },
  { id: "version_10", re: /\b1\.0\b/ },
  { id: "ref_brief_r", re: /\([R]\d{1,2}\)/ },
  { id: "todo_decision", re: /TODO\(decisión/i },
  { id: "codigo_diseno", re: /\b[DTL]-\d{1,3}\b/ },
  { id: "pendiente_confirmar", re: /pendiente de confirmar/i },
];

/** Devuelve el id del primer patrón que coincide, o null si el texto es aceptable. */
export function hallarLenguajeInterno(texto: string | undefined | null): string | null {
  const t = (texto ?? "").trim();
  if (!t) return null;
  for (const { id, re } of PATRONES) {
    if (re.test(t)) return id;
  }
  return null;
}

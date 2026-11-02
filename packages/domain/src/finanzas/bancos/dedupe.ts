/** Huella de deduplicación de movimientos bancarios (paridad 1.0). */
export function claveDedupe(input: {
  fecha: string;
  monto: number;
  glosa: string;
  referencia?: string | null;
  suelta?: boolean;
}): string {
  const g = normalizarGlosa(input.glosa);
  const base = `${input.fecha}|${input.monto}|${g}`;
  if (input.suelta) return base;
  const ref = (input.referencia ?? "").trim();
  return `${base}|${ref}`;
}

/** Clave de cartola (fecha|monto|glosa sin referencia). */
export function claveDedupeCartola(input: { fecha: string; monto: number; glosa: string }): string {
  return claveDedupe({ ...input, suelta: true });
}

export function normalizarGlosa(glosa: string): string {
  return glosa.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Ordinal ≥2 se guarda como `base~N` para no confundirlo con glosas que terminan en «#N». */
export function claveDedupeConOrdinal(base: string, ordinal: number): string {
  return ordinal <= 1 ? base : `${base}~${ordinal}`;
}

export function descomponerClaveDedupe(clave: string): { base: string; ordinal: number } {
  const sep = clave.lastIndexOf("~");
  if (sep > 0) {
    const tail = clave.slice(sep + 1);
    if (/^\d+$/.test(tail) && Number(tail) >= 2) {
      return { base: clave.slice(0, sep), ordinal: Number(tail) };
    }
  }
  return { base: clave, ordinal: 1 };
}

/** Misma operación si el saldo posterior al movimiento coincide (solo señal API). */
export function mismoSaldoDespues(a: bigint | number | null | undefined, b: bigint | number | null | undefined): boolean {
  if (a == null || b == null) return false;
  return BigInt(a) === BigInt(b);
}

export type FilaDedupeEntrada = {
  indice: number;
  base: string;
  saldoDespues: number | null;
};

export type FilaDedupePlanificada =
  | { indice: number; estado: "leida"; claveDedupe: string; base: string; saldoDespues: number | null }
  | { indice: number; estado: "duplicada"; base: string; saldoDespues: number | null };

/**
 * Regla cartola 1.0: por clave cuenta k guardadas y n en archivo; min(n,k) duplicadas; inserta n−k.
 * No usa saldo (solo señal en movimientos por API).
 */
export function planificarDedupeCartola(
  filas: FilaDedupeEntrada[],
  existentes: { claveDedupe: string; saldoDespues?: bigint | number | null }[],
): FilaDedupePlanificada[] {
  const kPorBase = new Map<string, number>();
  for (const e of existentes) {
    const { base } = descomponerClaveDedupe(e.claveDedupe);
    kPorBase.set(base, (kPorBase.get(base) ?? 0) + 1);
  }

  const porBase = new Map<string, FilaDedupeEntrada[]>();
  for (const f of filas) {
    const list = porBase.get(f.base) ?? [];
    list.push(f);
    porBase.set(f.base, list);
  }

  const out: FilaDedupePlanificada[] = [];
  for (const [base, lista] of porBase) {
    const k = kPorBase.get(base) ?? 0;
    const n = lista.length;
    const duplicadas = Math.min(n, k);

    for (let i = 0; i < lista.length; i += 1) {
      const fila = lista[i]!;
      if (i < duplicadas) {
        out.push({ indice: fila.indice, estado: "duplicada", base, saldoDespues: fila.saldoDespues });
        continue;
      }
      const ordinal = k + (i - duplicadas) + 1;
      out.push({
        indice: fila.indice,
        estado: "leida",
        claveDedupe: claveDedupeConOrdinal(base, ordinal),
        base,
        saldoDespues: fila.saldoDespues,
      });
    }
  }
  return out.sort((a, b) => a.indice - b.indice);
}

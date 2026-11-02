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

export function normalizarGlosa(glosa: string): string {
  return glosa.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Ordinal ≥2 se guarda como `base#N` para no confundirlo con la referencia bancaria. */
export function claveDedupeConOrdinal(base: string, ordinal: number): string {
  return ordinal <= 1 ? base : `${base}#${ordinal}`;
}

export function descomponerClaveDedupe(clave: string): { base: string; ordinal: number } {
  const sep = clave.lastIndexOf("#");
  if (sep > 0) {
    const tail = clave.slice(sep + 1);
    if (/^\d+$/.test(tail) && Number(tail) >= 2) {
      return { base: clave.slice(0, sep), ordinal: Number(tail) };
    }
  }
  return { base: clave, ordinal: 1 };
}

/** Misma operación si el saldo posterior al movimiento coincide. */
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

/** Asigna ordinal por aparición (archivo + ya importadas) como en 1.0. */
export function planificarDedupeCartola(
  filas: FilaDedupeEntrada[],
  existentes: { claveDedupe: string; saldoDespues: bigint | number | null }[],
): FilaDedupePlanificada[] {
  const dbPorBase = new Map<string, ({ clave: string; saldo: bigint | number | null } | undefined)[]>();
  for (const e of existentes) {
    const { base, ordinal } = descomponerClaveDedupe(e.claveDedupe);
    const list = dbPorBase.get(base) ?? [];
    list[ordinal - 1] = { clave: e.claveDedupe, saldo: e.saldoDespues };
    dbPorBase.set(base, list);
  }

  const porBase = new Map<string, FilaDedupeEntrada[]>();
  for (const f of filas) {
    const list = porBase.get(f.base) ?? [];
    list.push(f);
    porBase.set(f.base, list);
  }

  const out: FilaDedupePlanificada[] = [];
  for (const [base, lista] of porBase) {
    const dbSlots = dbPorBase.get(base) ?? [];
    let nuevosEnArchivo = 0;
    for (let i = 0; i < lista.length; i += 1) {
      const fila = lista[i]!;
      const slot = i + 1;
      const db = dbSlots[slot - 1];
      if (db && mismoSaldoDespues(db.saldo, fila.saldoDespues)) {
        out.push({ indice: fila.indice, estado: "duplicada", base, saldoDespues: fila.saldoDespues });
        continue;
      }
      let ordinal = slot;
      if (db) {
        ordinal = dbSlots.length + nuevosEnArchivo + 1;
      } else {
        ordinal = Math.max(slot, dbSlots.length + nuevosEnArchivo + 1);
      }
      nuevosEnArchivo += 1;
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

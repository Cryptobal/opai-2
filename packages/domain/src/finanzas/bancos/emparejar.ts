// Emparejar movimientos entrantes (cartola o banco en línea) con los ya guardados de la cuenta (CAR-341), como la
// conciliación de Xero o QuickBooks: un mismo movimiento no se guarda dos veces aunque llegue por otra vía o con otra
// fecha. Emparejamiento uno a uno, en cuatro pasadas: 1) mismo número de documento y monto; 2) misma huella exacta
// (fecha, monto y glosa); 3) mismo monto, fecha a ±N días y glosa parecida, eligiendo primero la fecha más cercana;
// 4) solo con el banco en línea (CAR-450): mismo monto y fecha a ±N días aunque la glosa no se parezca, si el par es
// el único candidato en ambos sentidos.

import { normalizarGlosa } from "./dedupe";

export type MovimientoEmparejable = {
  fecha: string;
  monto: number;
  glosa: string;
  referencia: string | null;
};

export type ExistenteEmparejable = MovimientoEmparejable & { id: string };

export type Emparejado = {
  existenteId: string;
  /** referencia | exacta | parecida | monto (único candidato del banco en línea, CAR-450) */
  por: "referencia" | "exacta" | "parecida" | "monto";
  /** Fecha guardada del existente (puede diferir de la entrante en la pasada 1 o 3). */
  fechaExistente: string;
};

/** Días entre dos fechas ISO (aaaa-mm-dd), en valor absoluto. */
export function diasEntre(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

const VACIAS = new Set(["DE", "LA", "EL", "LOS", "LAS", "DEL", "POR", "PARA", "CON", "EN", "Y", "A", "AL"]);

/** Palabras con contenido de una glosa: sin tildes ni signos, sin palabras vacías ni letras sueltas. */
export function palabrasGlosa(glosa: string): Set<string> {
  const t = normalizarGlosa(glosa.normalize("NFD").replace(/[̀-ͯ]/g, ""))
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
  return new Set(t.split(" ").filter((p) => p.length >= 2 && !VACIAS.has(p)));
}

/** Documento comparable: sin espacios ni ceros a la izquierda; null si no sirve para identificar (corto o solo ceros). */
export function documentoComparable(ref: string | null | undefined): string | null {
  const t = (ref ?? "").replace(/\s+/g, "").replace(/^0+/, "").toUpperCase();
  return t.length >= 4 ? t : null;
}

/**
 * Dos glosas describen la misma operación si son iguales normalizadas, si una contiene a la otra, o si comparten la
 * mitad o más de las palabras de la más corta (el banco en línea y la cartola rotulan distinto la misma operación).
 */
export function glosasParecidas(a: string, b: string): boolean {
  const na = normalizarGlosa(a);
  const nb = normalizarGlosa(b);
  if (na === nb) return true;
  const sa = na.replace(/\s+/g, "");
  const sb = nb.replace(/\s+/g, "");
  if (sa.length >= 4 && sb.length >= 4 && (sa.includes(sb) || sb.includes(sa))) return true;
  const pa = palabrasGlosa(a);
  const pb = palabrasGlosa(b);
  const menor = Math.min(pa.size, pb.size);
  if (menor === 0) return false;
  let comunes = 0;
  for (const p of pa) if (pb.has(p)) comunes += 1;
  return comunes / menor >= 0.5;
}

/**
 * Empareja cada entrante (por su índice en la lista) con a lo más un existente, y cada existente con a lo más un
 * entrante. Los que no emparejan son movimientos nuevos. `toleranciaDias` acota las pasadas 1, 3 y 4. La pasada 4
 * solo considera los pares que cumplen `porMontoSi` (sin él no corre): el banco en línea rotula distinto que la
 * cartola, así que ahí basta el monto y la fecha cercana cuando no hay ambigüedad. La ambigüedad se mide solo entre
 * pares elegibles: un registro de otro origen con el mismo monto no impide el par.
 */
export function emparejarMovimientos<E extends MovimientoEmparejable>(
  entrantes: readonly E[],
  existentes: readonly ExistenteEmparejable[],
  opciones: { toleranciaDias?: number; porMontoSi?: (e: ExistenteEmparejable, m: E) => boolean } = {},
): Map<number, Emparejado> {
  const tol = opciones.toleranciaDias ?? 3;
  const out = new Map<number, Emparejado>();
  const usados = new Set<string>();
  const libres = (i: number) => !out.has(i);
  const asignar = (i: number, e: ExistenteEmparejable, por: Emparejado["por"]) => {
    out.set(i, { existenteId: e.id, por, fechaExistente: e.fecha });
    usados.add(e.id);
  };
  const porMonto = new Map<number, ExistenteEmparejable[]>();
  for (const e of existentes) porMonto.set(e.monto, [...(porMonto.get(e.monto) ?? []), e]);

  const pasada = (por: Emparejado["por"], calza: (m: E, e: ExistenteEmparejable) => boolean) => {
    const pares: { i: number; e: ExistenteEmparejable; d: number }[] = [];
    entrantes.forEach((m, i) => {
      if (!libres(i)) return;
      for (const e of porMonto.get(m.monto) ?? []) {
        if (usados.has(e.id) || !calza(m, e)) continue;
        pares.push({ i, e, d: diasEntre(m.fecha, e.fecha) });
      }
    });
    // La fecha más cercana primero; a igual distancia, el orden de llegada (estable).
    pares.sort((x, y) => x.d - y.d || x.i - y.i);
    for (const p of pares) if (libres(p.i) && !usados.has(p.e.id)) asignar(p.i, p.e, por);
  };

  pasada("referencia", (m, e) => {
    const a = documentoComparable(m.referencia);
    return a != null && a === documentoComparable(e.referencia) && diasEntre(m.fecha, e.fecha) <= tol;
  });
  pasada("exacta", (m, e) => m.fecha === e.fecha && normalizarGlosa(m.glosa) === normalizarGlosa(e.glosa));
  pasada("parecida", (m, e) => diasEntre(m.fecha, e.fecha) <= tol && glosasParecidas(m.glosa, e.glosa));
  if (opciones.porMontoSi) {
    const elegible = opciones.porMontoSi;
    const candidatos = new Map<number, ExistenteEmparejable[]>();
    const vecesExistente = new Map<string, number>();
    entrantes.forEach((m, i) => {
      if (!libres(i)) return;
      const c = (porMonto.get(m.monto) ?? []).filter((e) => !usados.has(e.id) && elegible(e, m) && diasEntre(m.fecha, e.fecha) <= tol);
      candidatos.set(i, c);
      for (const e of c) vecesExistente.set(e.id, (vecesExistente.get(e.id) ?? 0) + 1);
    });
    // Solo pares sin ambigüedad: un único existente para el entrante y un único entrante para ese existente.
    for (const [i, c] of candidatos) if (c.length === 1 && vecesExistente.get(c[0]!.id) === 1) asignar(i, c[0]!, "monto");
  }
  return out;
}

/** Primera clave libre para una huella: la base, o `base~2`, `base~3`… si ya está ocupada. La agrega a `ocupadas`. */
export function claveLibre(base: string, ocupadas: Set<string>): string {
  let n = 1;
  let clave = base;
  while (ocupadas.has(clave)) {
    n += 1;
    clave = `${base}~${n}`;
  }
  ocupadas.add(clave);
  return clave;
}

import { createHmac, timingSafeEqual } from "node:crypto";

import { claveDedupeCartola, claveDedupeConOrdinal, descomponerClaveDedupe } from "./dedupe";

/** Ventana anti-repetición entre la hora del mensaje y la del servidor (paridad 1.0). */
export const VENTANA_WEB4LEADS_S = 300;

/** HMAC-SHA256(secreto, cuerpo + timestamp) en hexadecimal, como lo firma Web4Leads (paridad 1.0). */
export function verificarFirmaWeb4leads(
  secreto: string,
  cuerpo: string,
  timestamp: string,
  firma: string,
  ahoraS = Math.floor(Date.now() / 1000),
): boolean {
  if (!secreto || !timestamp || !firma) return false;
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(ahoraS - ts) > VENTANA_WEB4LEADS_S) return false;
  const esperada = createHmac("sha256", secreto).update(cuerpo + timestamp).digest();
  if (!/^[0-9a-fA-F]+$/.test(firma) || firma.length !== esperada.length * 2) return false;
  return timingSafeEqual(esperada, Buffer.from(firma, "hex"));
}

/** Solo dígitos, para casar el número de cuenta del banco con el de la cuenta de OPAI. */
export function normalizarNumeroCuenta(numero: string): string {
  return (numero ?? "").replace(/\D/g, "");
}

export function normalizarBanco(banco: string): string {
  return (banco ?? "").trim().toUpperCase().replace(/^BANCO\s+/, "");
}

export type MovimientoApiEntrada = {
  indice: number;
  idExterno: string;
  fecha: string;
  monto: number;
  glosa: string;
  saldoDespues: number | null;
};

export type MovimientoApiExistente = {
  claveDedupe: string;
  saldoDespues: bigint | number | null;
  idExterno: string | null;
};

export type MovimientoApiPlan =
  | { indice: number; estado: "duplicado"; motivo: "id_externo" | "mismo_saldo" }
  | { indice: number; estado: "nuevo"; claveDedupe: string; sospechoso: boolean };

/**
 * Decide qué movimientos del banco se insertan. 1) Un id externo ya guardado es la misma operación.
 * 2) Misma huella (fecha|monto|glosa, la de la cartola) y mismo saldo posterior: misma operación, aunque
 * venga de una cartola. 3) Misma huella sin saldo que discrimine: se inserta con ordinal y queda como
 * sospechoso para revisión. Con saldo distinto en todas las copias es otra operación, no sospechosa.
 */
export function planificarMovimientosApi(
  entrantes: MovimientoApiEntrada[],
  existentes: MovimientoApiExistente[],
): MovimientoApiPlan[] {
  const ids = new Set(existentes.flatMap((e) => (e.idExterno ? [e.idExterno] : [])));
  const porBase = new Map<string, (bigint | null)[]>();
  const sumar = (base: string, saldo: bigint | number | null) => {
    const lista = porBase.get(base) ?? [];
    lista.push(saldo == null ? null : BigInt(saldo));
    porBase.set(base, lista);
  };
  for (const e of existentes) sumar(descomponerClaveDedupe(e.claveDedupe).base, e.saldoDespues);

  return entrantes.map((m): MovimientoApiPlan => {
    if (ids.has(m.idExterno)) return { indice: m.indice, estado: "duplicado", motivo: "id_externo" };
    ids.add(m.idExterno);
    const base = claveDedupeCartola({ fecha: m.fecha, monto: m.monto, glosa: m.glosa });
    const previas = porBase.get(base) ?? [];
    const saldo = m.saldoDespues == null ? null : BigInt(m.saldoDespues);
    if (saldo != null && previas.some((p) => p === saldo)) {
      return { indice: m.indice, estado: "duplicado", motivo: "mismo_saldo" };
    }
    const discrimina = saldo != null && previas.every((p) => p != null);
    const ordinal = previas.length + 1;
    const sospechoso = previas.length > 0 && !discrimina;
    sumar(base, saldo);
    return { indice: m.indice, estado: "nuevo", claveDedupe: claveDedupeConOrdinal(base, ordinal), sospechoso };
  });
}

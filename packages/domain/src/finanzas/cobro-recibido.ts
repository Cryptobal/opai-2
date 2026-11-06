// Doble conteo en la semana en curso (ADR-073, BRIEF-38): un abono del banco que todavía no está conciliado ya forma
// parte del saldo de hoy; si su factura sigue proyectándose, el mismo dinero se contaría dos veces. Pura.

import { normalizarRut } from "../rut";
import { rutEnGlosa } from "./bancos/conciliacion";

export type AbonoSinConciliar = { id: string; monto: number; glosa: string; /** aaaa-mm-dd; solo cuenta si el cobro fija `desde`. */ fecha?: string };
export type CobroProyectado = {
  id: string;
  /** Monto pendiente que se proyecta (factura) o depósito esperado del factor. */
  monto: number;
  /** RUT de quien debería pagar (cliente o factor); null si no se conoce. */
  rut: string | null;
  /** Solo empareja con abonos de esta fecha en adelante (aaaa-mm-dd). */
  desde?: string;
};

export type PosibleCobroRecibido = { proyectadoId: string; abonoId: string; monto: number };

/**
 * Empareja abonos sin conciliar con cobros proyectados. Coincidencia segura = monto exacto y el RUT de la glosa es el
 * de quien paga: el cobro ya está en el saldo y no se proyecta. Monto exacto sin RUT que calce = posible cobro: se
 * mantiene la proyección y se avisa. Cada abono se usa una sola vez.
 */
export function emparejarAbonosConCobros(o: {
  abonos: readonly AbonoSinConciliar[];
  cobros: readonly CobroProyectado[];
}): { seguros: Map<string, string>; posibles: PosibleCobroRecibido[] } {
  const usados = new Set<string>();
  const seguros = new Map<string, string>();
  const posibles: PosibleCobroRecibido[] = [];
  const rutDe = (a: AbonoSinConciliar) => rutEnGlosa(a.glosa);
  const elegible = (a: AbonoSinConciliar, c: CobroProyectado) => !usados.has(a.id) && (!c.desde || (a.fecha ?? "") >= c.desde);
  const cobros = [...o.cobros].sort((a, b) => b.monto - a.monto || a.id.localeCompare(b.id));
  // Primero las coincidencias seguras (monto + RUT), para que un posible no gaste el abono de una segura.
  for (const c of cobros) {
    const rut = c.rut ? normalizarRut(c.rut) : null;
    if (!rut) continue;
    const abono = o.abonos.find((a) => elegible(a, c) && a.monto === c.monto && rutDe(a) === rut);
    if (abono) {
      usados.add(abono.id);
      seguros.set(c.id, abono.id);
    }
  }
  for (const c of cobros) {
    if (seguros.has(c.id)) continue;
    const abono = o.abonos.find((a) => elegible(a, c) && a.monto === c.monto);
    if (abono) {
      usados.add(abono.id);
      posibles.push({ proyectadoId: c.id, abonoId: abono.id, monto: abono.monto });
    }
  }
  return { seguros, posibles };
}

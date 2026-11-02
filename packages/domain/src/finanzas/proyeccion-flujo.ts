// Contrato entre Ventas DTE (CAR-137) y Flujo de caja (CAR-136, ADR-026). Solo tipos y reglas puras:
// las capas Comprometido y Real del flujo se derivan al leer desde hechos, nunca se copian a celdas.

/** Ingreso proyectado que una factura emitida aporta al flujo (capa Real al emitir; Comprometido desde plantillas). */
export type IngresoProyectadoDesdeDte = {
  documentoEmitidoId: string;
  cuentaId: string;
  instalacionId: string | null;
  /** Semana ISO (lunes) en que se espera el cobro, formato aaaa-mm-dd. */
  semanaCobro: string;
  monto: number;
  etiqueta: string;
  /** "real" si ya está emitida y aceptada; "comprometido" si solo hay borrador/programación. */
  capa: "real" | "comprometido";
};

/** Filtra ingresos dentro del horizonte [desde, hasta] (semanas ISO inclusivas). */
export function ingresosEnHorizonte(
  items: readonly IngresoProyectadoDesdeDte[],
  desde: string,
  hasta: string,
): IngresoProyectadoDesdeDte[] {
  return items.filter((i) => i.semanaCobro >= desde && i.semanaCobro <= hasta);
}

/** Suma de montos por capa (enteros CLP). */
export function totalPorCapa(
  items: readonly IngresoProyectadoDesdeDte[],
  capa: IngresoProyectadoDesdeDte["capa"],
): number {
  return items.filter((i) => i.capa === capa).reduce((a, i) => a + i.monto, 0);
}

// Cesión / factoring (CAR-140): simulación de anticipo, merma y saldo (paridad 1.0).

export type SimulacionCesion = {
  anticipo: number;
  merma: number;
  saldoFactor: number;
  netoAlCeder: number;
};

/** Calcula montos enteros CLP a partir del total de la factura y la tasa en basis points. */
export function simularCesion(montoTotal: number, tasaBps: number): SimulacionCesion {
  if (montoTotal <= 0) {
    return { anticipo: 0, merma: 0, saldoFactor: 0, netoAlCeder: 0 };
  }
  const merma = Math.round((montoTotal * tasaBps) / 10_000);
  const anticipo = Math.max(0, montoTotal - merma);
  return {
    anticipo,
    merma,
    saldoFactor: merma,
    netoAlCeder: anticipo,
  };
}

export function documentoPorCobrar(o: {
  estadoCobro: string;
  cesionEstado: string | null;
  montoTotal: number;
  montoCobrado: number;
}): boolean {
  if (o.cesionEstado === "cedido" || o.estadoCobro === "cedida") return false;
  if (o.estadoCobro === "pagada") return false;
  return Math.max(0, o.montoTotal - o.montoCobrado) > 0;
}

export function puedeCederDocumento(o: {
  tipoDte: number;
  estadoDte: string;
  cesionEstado: string | null;
  xmlStorageKey: string | null;
  estadoCobro: string;
  montoTotal: number;
  montoCobrado: number;
  anuladaPorNc: boolean;
}): string | null {
  if (o.tipoDte !== 33 && o.tipoDte !== 34) return "Solo se ceden facturas 33 o 34.";
  if (o.estadoDte !== "aceptado") return "La factura debe estar aceptada por el SII.";
  if (o.anuladaPorNc) {
    return "La factura está anulada por nota de crédito.";
  }
  if (!o.xmlStorageKey) return "Falta el XML local del DTE.";
  if (o.cesionEstado === "cedido" || o.estadoCobro === "cedida") return "La factura ya está cedida.";
  if (o.cesionEstado === "emitido") return "Hay una cesión en curso para esta factura.";
  if (o.estadoCobro === "pagada" || o.montoCobrado >= o.montoTotal) {
    return "La factura debe estar impaga para cederla.";
  }
  if (o.estadoCobro === "pagada_parcial" || o.montoCobrado > 0) {
    return "La factura tiene cobros registrados; no se puede ceder.";
  }
  return null;
}

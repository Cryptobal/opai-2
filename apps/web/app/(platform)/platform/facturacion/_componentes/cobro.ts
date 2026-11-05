import { formatearClp, formatearFecha, formatearPorcentaje, formatearUf } from "@opai/domain";

// Tipos y formato del cobro por módulo (CAR-188) compartidos por Facturación y la pestaña Cobro.
// Reflejan la salida de `platform.cobros.resumen` y `platform.cobros.cargos_list`.

export type Moneda = "CLP" | "UF";

export type Condicion = {
  moneda: Moneda;
  precioMensual: number;
  cobroDesde: string | null;
  pruebaHasta: string | null;
  descuentoPct: number;
  nota: string | null;
};

export type Calculo = {
  facturable: boolean;
  motivo: string;
  motivoTexto: string;
  desde: string | null;
  diasCobrados: number;
  diasMes: number;
  monto: number;
  montoClp: number | null;
};

export type Cargo = {
  id: string;
  moduloId: string;
  periodo: string;
  moneda: Moneda;
  monto: number;
  montoClp: number;
  diasCobrados: number;
  diasMes: number;
  ufCentavos: number | null;
  estado: "listo" | "anulado";
  motivoAnulacion: string | null;
};

export type ModuloCobro = {
  moduloId: string;
  nombre: string;
  estado: string | null;
  condicion: Condicion | null;
  calculo: Calculo;
  cargo: Cargo | null;
};

export type EmpresaCobro = {
  tenantId: string;
  nombre: string;
  slug: string;
  estado: string;
  modulos: ModuloCobro[];
  totalClp: number;
  facturables: number;
};

export type Resumen = {
  periodo: string;
  uf: { centavos: number; exacta: boolean } | null;
  empresas: EmpresaCobro[];
  totales: {
    totalClp: number;
    facturables: number;
    noFacturables: number;
    porMoneda: { moneda: Moneda; monto: number }[];
  };
};

export const clp = (n: number | null | undefined) => (n == null ? "—" : formatearClp(n));
export const enMoneda = (monto: number, moneda: Moneda) =>
  moneda === "UF" ? formatearUf(monto) : formatearClp(monto);

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** «octubre de 2026» desde «2026-10». */
export function nombreMes(periodo: string): string {
  const [a, m] = periodo.split("-").map(Number) as [number, number];
  return `${MESES[m - 1] ?? ""} de ${a}`;
}

/** Los últimos `n` meses (aaaa-mm), del actual hacia atrás. */
export function mesesRecientes(actual: string, n = 12): string[] {
  const [a, m] = actual.split("-").map(Number) as [number, number];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

/** «UF 2,50 al mes · desde 01-11-2026 · prueba hasta 15-11-2026 · 10,0 % de descuento». */
export function textoCondicion(c: Condicion): string {
  const partes = [`${enMoneda(c.precioMensual, c.moneda)} al mes`];
  if (c.cobroDesde) partes.push(`desde ${formatearFecha(c.cobroDesde)}`);
  if (c.pruebaHasta) partes.push(`prueba hasta ${formatearFecha(c.pruebaHasta)}`);
  if (c.descuentoPct) partes.push(`${formatearPorcentaje(c.descuentoPct)} de descuento`);
  return partes.join(" · ");
}

export const ESTADOS_MODULO: Record<string, string> = {
  activo: "Activo",
  trial: "En prueba",
  suspendido: "Suspendido",
};

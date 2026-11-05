import {
  formatearClp,
  formatearFecha,
  formatearPorcentaje,
  formatearUf,
  type UnidadCobro,
  UNIDADES_COBRO,
} from "@opai/domain";

// Tipos y formato del cobro por módulo (CAR-188) compartidos por Facturación y la pestaña Cobro.
// Reflejan la salida de `platform.cobros.resumen` y `platform.cobros.cargos_list`.

export type Moneda = "CLP" | "UF";

export type Forma = "fijo" | "por_unidad";

export type Condicion = {
  moneda: Moneda;
  forma: Forma;
  unidad: UnidadCobro | null;
  /** Mensual (fijo) o por unidad: pesos o UF × 10.000. */
  precio: number;
  minimoMensual: number | null;
  cobroDesde: string | null;
  pruebaHasta: string | null;
  pasaACobro: boolean;
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
  cantidad: number | null;
  mensual: number;
  descuento: number;
  monto: number;
  montoClp: number | null;
};

export type Cargo = {
  id: string;
  moduloId: string;
  periodo: string;
  moneda: Moneda;
  forma: Forma;
  unidad: UnidadCobro | null;
  cantidad: number | null;
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
  noFacturables: number;
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

export { mesesRecientes, nombreMes } from "./meses";

export const clp = (n: number | null | undefined) => (n == null ? "—" : formatearClp(n));
export const enMoneda = (monto: number, moneda: Moneda) =>
  moneda === "UF" ? formatearUf(monto) : formatearClp(monto);

/** «5 usuarios activos» / «1 instalación activa». */
export function textoCantidad(cantidad: number, unidad: UnidadCobro | null): string {
  const u = unidad ? UNIDADES_COBRO[unidad] : null;
  return u ? `${cantidad} ${cantidad === 1 ? u.singular : u.plural}` : String(cantidad);
}

/** «UF 0,50 por usuario activo · mínimo UF 4,00 · desde 01-11-2026 · 10,0 % de descuento». */
export function textoCondicion(c: Condicion): string {
  const precio = enMoneda(c.precio, c.moneda);
  const partes = [
    c.forma === "por_unidad" && c.unidad
      ? `${precio} por ${UNIDADES_COBRO[c.unidad].singular}`
      : `${precio} al mes`,
  ];
  if (c.minimoMensual) partes.push(`mínimo ${enMoneda(c.minimoMensual, c.moneda)} al mes`);
  if (c.cobroDesde) partes.push(`desde ${formatearFecha(c.cobroDesde)}`);
  if (c.pruebaHasta)
    partes.push(
      `prueba hasta ${formatearFecha(c.pruebaHasta)} (${c.pasaACobro ? "pasa a cobro" : "luego solo lectura"})`,
    );
  if (c.descuentoPct) partes.push(`${formatearPorcentaje(c.descuentoPct)} de descuento`);
  return partes.join(" · ");
}

export const ESTADOS_MODULO: Record<string, string> = {
  activo: "Activo",
  trial: "En prueba",
  suspendido: "Suspendido",
};

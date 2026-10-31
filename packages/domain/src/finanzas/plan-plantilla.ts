import type { ClaveSistema, CuentaPlan, GrupoCuenta, Naturaleza, TipoCuenta } from "./plan-tipos";

// Plantilla chilena base del plan de cuentas (finanzas-compras.md §3). Se carga al activar el módulo
// y el tenant la edita libremente. Los códigos siguen el esquema 1 Activo, 2 Pasivo, 3 Patrimonio,
// 4 Ingresos, 5 Costos, 6 Gastos; los títulos (no aceptan asientos) agrupan a las cuentas de movimiento.

type Fila = readonly [
  codigo: string,
  nombre: string,
  tipo: TipoCuenta,
  grupo: GrupoCuenta | null,
  padre: string | null,
  clave?: ClaveSistema | undefined,
  opciones?: { exigeCc?: boolean; naturaleza?: Naturaleza; titulo?: boolean } | undefined,
];

const FILAS: readonly Fila[] = [
  ["1", "Activo", "activo", null, null, undefined, { titulo: true }],
  ["1.1", "Activo corriente", "activo", "corriente", "1", undefined, { titulo: true }],
  ["1.1.01", "Caja", "activo", "corriente", "1.1", "caja"],
  ["1.1.02", "Bancos", "activo", "corriente", "1.1", "bancos"],
  ["1.1.03", "Deudores por venta", "activo", "corriente", "1.1", "deudores_por_venta"],
  ["1.1.04", "IVA crédito fiscal", "activo", "corriente", "1.1", "iva_credito"],
  ["1.1.05", "PPM por recuperar", "activo", "corriente", "1.1", "ppm"],
  ["1.2", "Activo no corriente", "activo", "no_corriente", "1", undefined, { titulo: true }],
  ["1.2.01", "Equipos y vehículos", "activo", "no_corriente", "1.2"],
  ["1.2.02", "Depreciación acumulada", "activo", "no_corriente", "1.2", undefined, { naturaleza: "acreedora" }],
  ["2", "Pasivo", "pasivo", null, null, undefined, { titulo: true }],
  ["2.1", "Pasivo corriente", "pasivo", "corriente", "2", undefined, { titulo: true }],
  ["2.1.01", "Proveedores", "pasivo", "corriente", "2.1", "proveedores"],
  ["2.1.02", "IVA débito fiscal", "pasivo", "corriente", "2.1", "iva_debito"],
  ["2.1.03", "Remuneraciones por pagar", "pasivo", "corriente", "2.1", "remuneraciones_por_pagar"],
  ["2.1.04", "Impuestos por pagar", "pasivo", "corriente", "2.1", "impuestos_por_pagar"],
  ["2.2", "Pasivo no corriente", "pasivo", "no_corriente", "2", undefined, { titulo: true }],
  ["2.2.01", "Préstamos bancarios de largo plazo", "pasivo", "no_corriente", "2.2"],
  ["3", "Patrimonio", "patrimonio", null, null, undefined, { titulo: true }],
  ["3.1.01", "Capital", "patrimonio", null, "3", "capital"],
  ["3.1.02", "Resultados acumulados", "patrimonio", null, "3", "resultados_acumulados"],
  ["3.1.03", "Resultado del ejercicio", "patrimonio", null, "3", "resultado_ejercicio"],
  ["4", "Ingresos", "ingreso", null, null, undefined, { titulo: true }],
  ["4.1.01", "Ventas de servicios", "ingreso", null, "4", "ventas"],
  ["4.1.02", "Otros ingresos", "ingreso", null, "4"],
  ["5", "Costos directos", "costo", null, null, undefined, { titulo: true }],
  ["5.1.01", "Costo de servicios", "costo", null, "5", "costo_ventas", { exigeCc: true }],
  ["5.1.02", "Remuneraciones del personal en terreno", "costo", null, "5", "remuneraciones", { exigeCc: true }],
  ["5.1.03", "Uniformes y equipamiento", "costo", null, "5", undefined, { exigeCc: true }],
  ["6", "Gastos de administración y ventas", "gasto", null, null, undefined, { titulo: true }],
  ["6.1.01", "Remuneraciones administrativas", "gasto", null, "6", undefined, { exigeCc: true }],
  ["6.1.02", "Arriendos", "gasto", null, "6", "arriendos", { exigeCc: true }],
  ["6.1.03", "Servicios básicos", "gasto", null, "6", "servicios_basicos", { exigeCc: true }],
  ["6.1.04", "Honorarios", "gasto", null, "6", "honorarios", { exigeCc: true }],
  ["6.1.05", "Combustible y mantención de vehículos", "gasto", null, "6", undefined, { exigeCc: true }],
  ["6.1.06", "Gastos bancarios", "gasto", null, "6"],
  ["6.1.07", "Otros gastos", "gasto", null, "6", undefined, { exigeCc: true }],
];

export const PLANTILLA_CHILENA: readonly CuentaPlan[] = FILAS.map(
  ([codigo, nombre, tipo, grupo, padreCodigo, clave, o]): CuentaPlan => ({
    codigo,
    nombre,
    tipo,
    naturaleza:
      o?.naturaleza ?? (tipo === "activo" || tipo === "costo" || tipo === "gasto" ? "deudora" : "acreedora"),
    grupo,
    exigeCentroCosto: o?.exigeCc ?? false,
    aceptaAsientos: !o?.titulo,
    padreCodigo,
    claveSistema: clave ?? null,
    activa: true,
  }),
);

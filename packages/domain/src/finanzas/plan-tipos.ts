// Plan de cuentas por tenant (finanzas-compras.md §3). Lógica pura, sin base de datos.

export const TIPOS_CUENTA = ["activo", "pasivo", "patrimonio", "ingreso", "costo", "gasto"] as const;
export type TipoCuenta = (typeof TIPOS_CUENTA)[number];

export const NATURALEZAS = ["deudora", "acreedora"] as const;
export type Naturaleza = (typeof NATURALEZAS)[number];

/** Solo activos y pasivos se clasifican en corriente / no corriente. */
export const GRUPOS_CUENTA = ["corriente", "no_corriente"] as const;
export type GrupoCuenta = (typeof GRUPOS_CUENTA)[number];

/**
 * Claves de sistema: identifican una cuenta por su rol contable, no por su nombre ni su código, para
 * poder validar su grupo aunque el tenant renombre o renumere. Una clave se usa en una sola cuenta.
 */
export const CLAVES_SISTEMA = [
  "caja",
  "bancos",
  "deudores_por_venta",
  "iva_credito",
  "ppm",
  "proveedores",
  "iva_debito",
  "remuneraciones_por_pagar",
  "impuestos_por_pagar",
  "capital",
  "resultados_acumulados",
  "resultado_ejercicio",
  "ventas",
  "costo_ventas",
  "remuneraciones",
  "arriendos",
  "servicios_basicos",
  "honorarios",
] as const;
export type ClaveSistema = (typeof CLAVES_SISTEMA)[number];

/** Naturaleza habitual de cada tipo; una contra-cuenta puede invertirla (aviso, no error). */
export const NATURALEZA_HABITUAL: Readonly<Record<TipoCuenta, Naturaleza>> = {
  activo: "deudora",
  costo: "deudora",
  gasto: "deudora",
  pasivo: "acreedora",
  patrimonio: "acreedora",
  ingreso: "acreedora",
};

/** Lo que el plan declara de una cuenta; `padreCodigo` evita depender de ids al validar. */
export type CuentaPlan = {
  codigo: string;
  nombre: string;
  tipo: TipoCuenta;
  naturaleza: Naturaleza;
  grupo: GrupoCuenta | null;
  exigeCentroCosto: boolean;
  aceptaAsientos: boolean;
  padreCodigo: string | null;
  claveSistema: ClaveSistema | null;
  activa: boolean;
};

export type AlertaPlan = {
  codigo:
    | "GRUPO_INCORRECTO"
    | "GRUPO_FALTANTE"
    | "GRUPO_NO_APLICA"
    | "TIPO_INCORRECTO"
    | "CODIGO_DUPLICADO"
    | "PADRE_INEXISTENTE"
    | "PADRE_DE_OTRO_TIPO"
    | "NATURALEZA_INUSUAL"
    | "CLAVE_REPETIDA";
  severidad: "error" | "aviso";
  cuenta: string;
  mensaje: string;
};

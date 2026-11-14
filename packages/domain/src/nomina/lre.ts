import { normalizarRut } from "../rut";
import { COLUMNAS_LRE } from "./lre-columnas";
import type { LineaLiquidacion } from "./liquidacion";

/**
 * Archivo del Libro de Remuneraciones Electrónico (CAR-99, ADR-057): una fila por liquidación, con las
 * columnas del Suplemento LRE. Verificado: separador «;» y nombre `rutempleador_aaaamm`
 * (`referencias/dt-integracion.md`), RUT sin puntos con guion y fechas dd/mm/aaaa (Suplemento). Por
 * verificar: texto del encabezado, RUT del nombre con o sin DV y los códigos de catálogo (AFP, salud,
 * región, comuna, jornada), que quedan vacíos. OPAI genera y valida; no envía nada a la DT (R11).
 */
export type DatosLre = {
  personaId: string;
  rut: string;
  /** aaaa-mm-dd. */
  inicioContrato: string;
  /** aaaa-mm-dd, solo si el contrato termina dentro del mes. */
  terminoContrato: string | null;
  diasTrabajados: number;
  diasLicencia: number;
  haberes: LineaLiquidacion[];
  descuentosLegales: LineaLiquidacion[];
  otrosDescuentos: LineaLiquidacion[];
  aportesEmpleador: LineaLiquidacion[] | null;
  liquido: number;
};

export type ErrorLre = { personaId: string | null; mensaje: string };
export type ArchivoLre = { nombre: string; contenido: string; filas: number; errores: ErrorLre[]; advertencias: string[] };

/** Concepto de la liquidación → columna LRE. Los que no tienen columna quedan solo en los totales. */
const CODIGO: Record<string, number> = {
  "Sueldo base": 2101, "Horas extra": 2102, "Gratificación": 2106, "Bonos imponibles": 2111,
  "Colación": 2301, "Movilización": 2302,
  AFP: 3141, Salud: 3143, "Seguro de cesantía": 3151, "Impuesto único": 3161,
  Anticipos: 3188, "Cuotas de préstamo": 3188, Descuentos: 3185,
  "Seguro de cesantía empleador": 4151, "Ley 16.744 y SANNA": 4152, SIS: 4155,
};
const NO_IMPONIBLES = new Set(["Colación", "Movilización", "Bonos no imponibles"]);
const COTIZACIONES = new Set(["AFP", "Salud", "Seguro de cesantía"]);

const fecha = (iso: string) => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };
const suma = (l: LineaLiquidacion[]) => l.reduce((s, x) => s + x.monto, 0);

/** Valores por código de una persona; los errores van aparte. */
export function filaLre(d: DatosLre): { valores: Map<number, number | string>; errores: ErrorLre[] } {
  const errores: ErrorLre[] = [];
  const v = new Map<number, number | string>();
  const rut = normalizarRut(d.rut);
  if (!rut) errores.push({ personaId: d.personaId, mensaje: "RUT inválido." });
  v.set(1101, rut ?? d.rut);
  v.set(1102, fecha(d.inicioContrato));
  if (d.terminoContrato) v.set(1103, fecha(d.terminoContrato));
  v.set(1115, d.diasTrabajados);
  v.set(1116, d.diasLicencia);
  const aportes = d.aportesEmpleador ?? [];
  if (!d.aportesEmpleador) errores.push({ personaId: d.personaId, mensaje: "Liquidación sin aportes del empleador: recalcula el período." });
  for (const l of [...d.haberes, ...d.descuentosLegales, ...d.otrosDescuentos, ...aportes]) {
    const c = CODIGO[l.concepto];
    if (c) v.set(c, Number(v.get(c) ?? 0) + l.monto);
  }
  const impuesto = d.descuentosLegales.filter((l) => l.concepto === "Impuesto único");
  const cotizaciones = d.descuentosLegales.filter((l) => COTIZACIONES.has(l.concepto));
  const noImponibles = suma(d.haberes.filter((l) => NO_IMPONIBLES.has(l.concepto)));
  const totalHaberes = suma(d.haberes);
  const totalDescuentos = suma(d.descuentosLegales) + suma(d.otrosDescuentos);
  v.set(5201, totalHaberes);
  v.set(5210, totalHaberes - noImponibles);
  v.set(5230, noImponibles);
  v.set(5301, totalDescuentos);
  v.set(5361, suma(impuesto));
  v.set(5341, suma(cotizaciones));
  v.set(5302, suma(d.otrosDescuentos));
  v.set(5410, suma(aportes));
  v.set(5501, totalHaberes - totalDescuentos);
  if (totalHaberes - totalDescuentos !== d.liquido)
    errores.push({ personaId: d.personaId, mensaje: "El líquido no cuadra con haberes menos descuentos." });
  return { valores: v, errores };
}

/** Arma el archivo completo: encabezado con todas las columnas del Suplemento y una fila por persona. */
export function archivoLre(e: { rutEmpleador: string; anio: number; mes: number; filas: DatosLre[] }): ArchivoLre {
  const errores: ErrorLre[] = [];
  const rutEmp = normalizarRut(e.rutEmpleador);
  if (!rutEmp) errores.push({ personaId: null, mensaje: "Falta un RUT válido de la empresa (Configuración → Remuneraciones o datos de la empresa)." });
  const encabezado = COLUMNAS_LRE.map(([c, n]) => `${n}(${c})`).join(";");
  const lineas = e.filas.map((d) => {
    const f = filaLre(d);
    errores.push(...f.errores);
    return COLUMNAS_LRE.map(([c]) => String(f.valores.get(c) ?? "")).join(";");
  });
  const conceptos = new Set(e.filas.flatMap((d) => [...d.haberes, ...(d.aportesEmpleador ?? [])].map((l) => l.concepto)));
  const advertencias = [
    "Formato por verificar: encabezado y códigos de catálogo contra el Suplemento LRE vigente antes de cargarlo en Mi DT.",
    "AFP, salud, AFC, región, comuna y tipo de jornada van vacíos: falta mapear sus códigos DT.",
    ...(conceptos.has("Bonos no imponibles") ? ["Bonos no imponibles sin columna propia: solo suman en el total no imponible."] : []),
    ...(conceptos.has("Aporte de la reforma") ? ["Aporte de la reforma previsional sin columna en el Suplemento consultado: solo suma en el total de aportes."] : []),
  ];
  const cuerpoRut = (rutEmp ?? "").split("-")[0] ?? "";
  const nombre = `${cuerpoRut || "rut"}_${e.anio}${String(e.mes).padStart(2, "0")}.csv`;
  return { nombre, contenido: [encabezado, ...lineas].join("\r\n") + "\r\n", filas: lineas.length, errores, advertencias };
}

import { normalizarRut } from "../rut";
import type { LineaLiquidacion } from "./liquidacion";

/** Retención de impuesto único en los descuentos legales de una liquidación. */
export function retencionImpuestoUnico(descuentosLegales: readonly LineaLiquidacion[]): number {
  return descuentosLegales.find((l) => l.concepto === "Impuesto único")?.monto ?? 0;
}

export type FilaF29Retencion = {
  personaId: string;
  rut: string;
  nombre: string;
  retencionClp: number;
};

export type ArchivoF29Retencion = {
  nombre: string;
  filas: FilaF29Retencion[];
  totalRetencionClp: number;
  errores: { personaId: string | null; mensaje: string }[];
  advertencias: string[];
};

const ADVERTENCIAS = [
  "Planilla orientativa para declarar retenciones de impuesto único en el F29; contrastar con el formato del SII antes del primer uso.",
  "Incluye solo trabajadores con contrato vigente en el mes (mismas reglas que el LRE).",
];

/** Nombre del Excel de retenciones F29 del período. */
export function nombreF29Retencion(anio: number, mes: number, rutEmpleador: string): string {
  const norm = normalizarRut(rutEmpleador.trim());
  const cuerpo = norm ? norm.split("-")[0]! : "00000000";
  return `f29_retencion_${cuerpo}_${String(mes).padStart(2, "0")}${anio}.xlsx`;
}

/** Arma filas y validaciones del archivo F29 de retenciones del período. */
export function archivoF29Retencion(input: {
  rutEmpleador: string;
  anio: number;
  mes: number;
  filas: readonly FilaF29Retencion[];
}): ArchivoF29Retencion {
  const errores: ArchivoF29Retencion["errores"] = [];
  const rut = input.rutEmpleador.trim();
  if (!rut) errores.push({ personaId: null, mensaje: "Falta el RUT del empleador en Ajustes o en los datos de la empresa." });
  if (input.filas.length === 0) errores.push({ personaId: null, mensaje: "El período no tiene liquidaciones con contrato vigente." });
  const totalRetencionClp = input.filas.reduce((s, f) => s + f.retencionClp, 0);
  return {
    nombre: nombreF29Retencion(input.anio, input.mes, rut),
    filas: [...input.filas],
    totalRetencionClp,
    errores,
    advertencias: ADVERTENCIAS,
  };
}
import type { DatosLre } from "./lre";

/** Una fila del libro de remuneraciones (informe humano; mismas cifras que el LRE por persona). */
export type FilaLibroRemuneraciones = {
  personaId: string;
  rut: string;
  nombre: string;
  diasTrabajados: number;
  diasLicencia: number;
  haberesImponibles: number;
  haberesNoImponibles: number;
  descuentosLegales: number;
  otrosDescuentos: number;
  liquido: number;
};

const NO_IMPONIBLES = new Set(["Colación", "Movilización", "Bonos no imponibles"]);
const suma = (m: number, c: { monto: number }) => m + c.monto;

/** Totales alineados con las columnas 5210, 5230, 5301 y 5302 del LRE. */
export function filaLibroRemuneraciones(d: DatosLre & { nombre: string }): FilaLibroRemuneraciones {
  const noImp = d.haberes.filter((l) => NO_IMPONIBLES.has(l.concepto)).reduce(suma, 0);
  const totalH = d.haberes.reduce(suma, 0);
  return {
    personaId: d.personaId,
    rut: d.rut,
    nombre: d.nombre,
    diasTrabajados: d.diasTrabajados,
    diasLicencia: d.diasLicencia,
    haberesImponibles: totalH - noImp,
    haberesNoImponibles: noImp,
    descuentosLegales: d.descuentosLegales.reduce(suma, 0),
    otrosDescuentos: d.otrosDescuentos.reduce(suma, 0),
    liquido: d.liquido,
  };
}

export function nombreLibroRemuneraciones(anio: number, mes: number, ext: "xlsx" | "pdf") {
  return `libro_remuneraciones_${anio}${String(mes).padStart(2, "0")}.${ext}`;
}
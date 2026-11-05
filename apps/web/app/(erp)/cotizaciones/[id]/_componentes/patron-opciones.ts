export type Patron = { id: string; nombre: string; resumen: string };

/** «4×4» y «4x4» son el mismo patrón (igual que el motor). */
export const mismoPatron = (a: string, b: string) => a.replace("×", "x") === b.replace("×", "x");

/** Opciones del selector: los patrones de la empresa y, si el puesto trae otro, ese valor para no perderlo. */
export function opcionesPatron(patrones: readonly Patron[], actual: string) {
  const opciones = patrones.map((p) => ({ valor: p.nombre, etiqueta: p.nombre, descripcion: p.resumen }));
  if (actual && !patrones.some((p) => mismoPatron(p.nombre, actual)))
    opciones.push({ valor: actual, etiqueta: actual, descripcion: "No está en Operaciones" });
  return opciones;
}

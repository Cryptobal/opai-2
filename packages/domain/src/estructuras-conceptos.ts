// Proyección por concepto de UNA capa; el nombre del export se conserva por compatibilidad.
import type { Estructura, Gratificacion, ItemEstructura, NivelEstructura } from "./estructuras";

export type ValorConcepto = number | Gratificacion | ItemEstructura | null;
export type ConceptoResuelto = {
  clave: string;
  nombre: string;
  valores: Record<NivelEstructura, ValorConcepto>;
  final: ValorConcepto;
  origen: NivelEstructura | null;
};
export type Combinacion = { estructura: Estructura | null; conceptos: ConceptoResuelto[] };
type Niveles = Partial<Record<NivelEstructura, Estructura | null>>;
const ORDEN = ["persona", "puesto", "instalacion"] as const;
const FIJOS = [
  ["sueldoBase", "Sueldo base"], ["colacion", "Colación"],
  ["movilizacion", "Movilización"], ["gratificacion", "Gratificación"],
  ["gratificacionMonto", "Gratificación · monto fijo"],
] as const;

/** @deprecated Nombre histórico: ya no combina, selecciona y proyecta una sola capa. */
export function combinarPorConcepto(n: Niveles): Combinacion {
  const origen = ORDEN.find((nivel) => n[nivel]) ?? null;
  const estructura = origen ? n[origen] ?? null : null;
  const concepto = (clave: string, nombre: string, valor: (e: Estructura) => ValorConcepto): ConceptoResuelto => ({
    clave, nombre, origen,
    valores: {
      persona: n.persona ? valor(n.persona) : null,
      puesto: n.puesto ? valor(n.puesto) : null,
      instalacion: n.instalacion ? valor(n.instalacion) : null,
      cargo: null,
    },
    final: estructura ? valor(estructura) : null,
  });
  const conceptos = FIJOS.map(([clave, nombre]) => concepto(clave, nombre, (e) => e[clave] ?? null));
  for (const item of estructura?.items ?? []) {
    conceptos.push(concepto(`bono:${item.nombre}`, item.nombre,
      (e) => e.items.find((i) => i.nombre === item.nombre) ?? null));
  }
  return { estructura, conceptos };
}

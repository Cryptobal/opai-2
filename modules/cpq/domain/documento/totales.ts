import { clp, ivaCLP, IVA_PCT } from "@opai/domain/dinero";

export type TotalesDocumento = {
  netoClp: number;
  ivaClp: number;
  totalClp: number;
  /** Tasa en unidades `PCT_ESCALA` (19 % = 190_000). */
  tasaIvaPct: number;
};

/**
 * Única fuente del neto, el IVA y el total de los documentos comerciales (CAR-192, PDF v4):
 * la cotización y la propuesta técnica la usan, así que nunca difieren entre sí.
 * `baseAdicionalClp` suma al neto lo que también lleva IVA (gastos generales y utilidad).
 */
export function totalesDocumento(
  netoClp: number,
  tasaIvaPct: number = IVA_PCT,
  baseAdicionalClp = 0,
): TotalesDocumento {
  const base = netoClp + baseAdicionalClp;
  const ivaClp = ivaCLP(clp(base), tasaIvaPct);
  return { netoClp, ivaClp, totalClp: base + ivaClp, tasaIvaPct };
}

/** «19 %» (o «19,5 %») para la etiqueta del IVA. */
export function etiquetaIva(tasaIvaPct: number): string {
  const pct = tasaIvaPct / 10_000;
  return `IVA ${String(Math.round(pct * 100) / 100).replace(".", ",")} %`;
}

export type SeccionEconomica = {
  nombre: string;
  /** Secciones con puestos reciben dinero; las comunes (insumos, equipos) se reparten entre ellas. */
  tienePuestos: boolean;
  netoMensualClp: number;
};

/**
 * Valores por sección para la propuesta: lo de las secciones sin puestos («Común») se reparte
 * en proporción entre las que sí tienen, de modo que las filas suman exactamente el neto
 * y «Común» nunca aparece con dinero. Sin secciones con puestos devuelve la lista vacía.
 */
export function repartirSeccionesComunes(
  secciones: readonly SeccionEconomica[],
): { nombre: string; netoMensualClp: number }[] {
  const con = secciones.filter((s) => s.tienePuestos);
  if (!con.length) return [];
  const comun = secciones.filter((s) => !s.tienePuestos).reduce((a, s) => a + s.netoMensualClp, 0);
  const base = con.reduce((a, s) => a + s.netoMensualClp, 0);
  const filas = con.map((s) => ({
    nombre: s.nombre,
    netoMensualClp:
      s.netoMensualClp +
      (base > 0 ? Math.round((comun * s.netoMensualClp) / base) : Math.round(comun / con.length)),
  }));
  const objetivo = base + comun;
  const resto = objetivo - filas.reduce((a, f) => a + f.netoMensualClp, 0);
  const mayor = filas.reduce(
    (m, f, i) => (f.netoMensualClp > (filas[m]?.netoMensualClp ?? -1) ? i : m),
    0,
  );
  if (resto !== 0 && filas[mayor]) filas[mayor].netoMensualClp += resto;
  return filas;
}

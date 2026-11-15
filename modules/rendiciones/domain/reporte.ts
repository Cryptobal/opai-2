/**
 * Reporte de gasto rendido (CAR-179, pantalla 07): suma por persona, categoría o centro de costo.
 * Dominio puro: recibe filas ya filtradas por período y estado y devuelve grupos ordenados.
 */

export const AGRUPACIONES = ["persona", "categoria", "centro"] as const;
export type Agrupacion = (typeof AGRUPACIONES)[number];

/** Estados que cuentan como gasto: aprobado (por pagar) y pagado. Lo enviado aún no es gasto. */
export const ESTADOS_GASTO = ["aprobada", "pagada"] as const;

/** Clave fija del centro «Administración / Oficina central» (no es una instalación). */
export const CLAVE_ADMINISTRACION = "administracion";

/** Tope de grupos que se devuelven; el resto se suma en «Otros» para no truncar el total. */
export const MAX_GRUPOS = 100;

/** Período máximo del reporte: un año (366 días). */
export const MAX_DIAS_REPORTE = 366;

export type FilaReporte = {
  solicitanteId: string;
  tipo: string;
  centroCosto: string;
  instalacionId: string | null;
  estado: string;
  montoTotal: number;
};

export type GrupoReporte = {
  /** id de la persona o la instalación, el tipo de rendición, «administracion» o «otros». */
  clave: string;
  cantidad: number;
  totalClp: number;
  aprobadoClp: number;
  pagadoClp: number;
};

export function claveDe(f: FilaReporte, por: Agrupacion): string {
  if (por === "persona") return f.solicitanteId;
  if (por === "categoria") return f.tipo;
  return f.centroCosto === "instalacion" && f.instalacionId ? f.instalacionId : CLAVE_ADMINISTRACION;
}

/** Agrupa y ordena por total descendente (empate: clave). Desde el grupo MAX_GRUPOS en adelante, todo va a «otros». */
export function agruparReporte(filas: readonly FilaReporte[], por: Agrupacion, max: number = MAX_GRUPOS): GrupoReporte[] {
  const mapa = new Map<string, GrupoReporte>();
  for (const f of filas) {
    const clave = claveDe(f, por);
    const g = mapa.get(clave) ?? { clave, cantidad: 0, totalClp: 0, aprobadoClp: 0, pagadoClp: 0 };
    g.cantidad += 1;
    g.totalClp += f.montoTotal;
    if (f.estado === "pagada") g.pagadoClp += f.montoTotal;
    else g.aprobadoClp += f.montoTotal;
    mapa.set(clave, g);
  }
  const orden = [...mapa.values()].sort((a, b) => b.totalClp - a.totalClp || a.clave.localeCompare(b.clave));
  if (orden.length <= max) return orden;
  const otros = orden.slice(max - 1).reduce<GrupoReporte>(
    (o, g) => ({
      clave: "otros",
      cantidad: o.cantidad + g.cantidad,
      totalClp: o.totalClp + g.totalClp,
      aprobadoClp: o.aprobadoClp + g.aprobadoClp,
      pagadoClp: o.pagadoClp + g.pagadoClp,
    }),
    { clave: "otros", cantidad: 0, totalClp: 0, aprobadoClp: 0, pagadoClp: 0 },
  );
  return [...orden.slice(0, max - 1), otros];
}

/** Días entre dos fechas aaaa-mm-dd, ambas incluidas; negativo si `hasta` es anterior a `desde`. */
export function diasDelPeriodo(desde: string, hasta: string): number {
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

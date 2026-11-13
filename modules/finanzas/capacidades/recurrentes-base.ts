// Datos para convertir las cuotas en UF o en % de ventas a CLP (CAR-349, bloque 2). Solo lectura y solo si algún
// recurrente activo los necesita: así un flujo con todo en CLP no suma consultas.
import { hoyChile } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { periodoAnterior, type BaseMonto } from "../domain/recurrentes-monto";
import { aFecha, aIso } from "./util";

type Lector = Pick<TenantTx, "indicadorLegal" | "valorPublicado" | "documentoEmitido">;

/** Mismos documentos que el libro de ventas del IVA/PPM: la nota de crédito resta, factura y ND suman. */
const VENTAS = { estadoDte: { in: ["enviado", "aceptado", "anulado_nc"] }, tipoDte: { in: [33, 34, 56, 61] } };
const entero = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

async function ufs(db: Lector, desde: string, hasta: string) {
  const ind = await db.indicadorLegal.findFirst({ where: { clave: "uf" }, select: { id: true } });
  if (!ind) return { porDia: new Map<string, number>(), ultima: null };
  // Orden por publicación: si un día tiene dos valores vigentes, gana el más reciente (igual que ufCentavosDelDia).
  const filas = await db.valorPublicado.findMany({
    where: { indicadorId: ind.id, estado: "vigente", vigenteDesde: { gte: aFecha(desde), lte: aFecha(hasta) } },
    orderBy: { createdAt: "asc" },
    select: { vigenteDesde: true, valorJson: true },
  });
  const porDia = new Map<string, number>();
  for (const f of filas) {
    const v = entero(f.valorJson);
    if (v != null) porDia.set(aIso(f.vigenteDesde), v);
  }
  const u = await db.valorPublicado.findFirst({
    where: { indicadorId: ind.id, estado: "vigente" },
    orderBy: [{ vigenteDesde: "desc" }, { createdAt: "desc" }],
    select: { vigenteDesde: true, valorJson: true },
  });
  const centavos = u ? entero(u.valorJson) : null;
  return { porDia, ultima: u && centavos != null ? { fecha: aIso(u.vigenteDesde), centavos } : null };
}

/** Ventas netas por período desde `desdeMes` (inclusive) hasta antes de `hastaMes` (si se da), agrupadas en la base. */
async function ventasPorPeriodo(db: Lector, desdeMes: string, hastaMes?: string) {
  const grupos = await db.documentoEmitido.groupBy({
    by: ["fechaEmision", "tipoDte"],
    where: { ...VENTAS, fechaEmision: { gte: aFecha(`${desdeMes}-01`), ...(hastaMes ? { lt: aFecha(`${hastaMes}-01`) } : {}) } },
    _sum: { montoNeto: true, montoExento: true },
  });
  const porPeriodo = new Map<string, number>();
  for (const g of grupos) {
    if (!g.fechaEmision) continue;
    const p = aIso(g.fechaEmision).slice(0, 7);
    const neto = (g._sum.montoNeto ?? 0) + (g._sum.montoExento ?? 0);
    porPeriodo.set(p, (porPeriodo.get(p) ?? 0) + (g.tipoDte === 61 ? -neto : neto));
  }
  return porPeriodo;
}

/**
 * Ventas del mes anterior a `desde` en adelante, más el último mes CERRADO con ventas (base para estimar meses que
 * aún no ocurren; el mes en curso está incompleto y no sirve de base).
 */
async function ventas(db: Lector, desde: string, periodoActual: string) {
  const porPeriodo = await ventasPorPeriodo(db, periodoAnterior(desde));
  let ultimo = [...porPeriodo.keys()].filter((p) => p < periodoActual).sort().at(-1) ?? null;
  if (!ultimo) {
    const previo = await db.documentoEmitido.findFirst({
      where: { ...VENTAS, fechaEmision: { lt: aFecha(`${periodoAnterior(desde)}-01`) } },
      orderBy: { fechaEmision: "desc" },
      select: { fechaEmision: true },
    });
    if (previo?.fechaEmision) {
      ultimo = aIso(previo.fechaEmision).slice(0, 7);
      for (const [p, v] of await ventasPorPeriodo(db, ultimo, periodoAnterior(desde))) if (p === ultimo) porPeriodo.set(p, v);
    }
  }
  // Empresa nueva sin ningún mes cerrado: a falta de algo mejor, el mes en curso (la cuota igual queda estimada).
  if (!ultimo && porPeriodo.has(periodoActual)) ultimo = periodoActual;
  return { porPeriodo, ultimo };
}

/**
 * Base de conversión para las cuotas entre `desde` y `hasta`. Solo consulta lo que piden las unidades presentes
 * (hasta 3 consultas de UF y 1 a 3 de ventas).
 */
export async function baseMonto(db: Lector, unidades: ReadonlySet<string>, desde: string, hasta: string): Promise<BaseMonto> {
  const periodoActual = hoyChile().slice(0, 7);
  const [u, v] = await Promise.all([
    unidades.has("uf") ? ufs(db, desde, hasta) : Promise.resolve({ porDia: new Map<string, number>(), ultima: null }),
    unidades.has("pct_ventas") ? ventas(db, desde, periodoActual) : Promise.resolve({ porPeriodo: new Map<string, number>(), ultimo: null }),
  ]);
  return {
    ufDelDia: (f) => u.porDia.get(f) ?? null,
    ufUltima: u.ultima,
    ventasNetas: (p) => v.porPeriodo.get(p) ?? null,
    ultimoPeriodoConVentas: v.ultimo,
    periodoActual,
  };
}

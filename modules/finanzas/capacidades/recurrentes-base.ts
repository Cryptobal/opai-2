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
  const filas = await db.valorPublicado.findMany({
    where: { indicadorId: ind.id, estado: "vigente", vigenteDesde: { gte: aFecha(desde), lte: aFecha(hasta) } },
    select: { vigenteDesde: true, valorJson: true },
  });
  const porDia = new Map<string, number>();
  for (const f of filas) {
    const v = entero(f.valorJson);
    if (v != null) porDia.set(aIso(f.vigenteDesde), v);
  }
  const u = await db.valorPublicado.findFirst({ where: { indicadorId: ind.id, estado: "vigente" }, orderBy: { vigenteDesde: "desc" }, select: { vigenteDesde: true, valorJson: true } });
  const centavos = u ? entero(u.valorJson) : null;
  return { porDia, ultima: u && centavos != null ? { fecha: aIso(u.vigenteDesde), centavos } : null };
}

async function ventas(db: Lector, desde: string) {
  const docs = await db.documentoEmitido.findMany({
    where: { ...VENTAS, fechaEmision: { gte: aFecha(`${periodoAnterior(desde)}-01`) } },
    select: { fechaEmision: true, tipoDte: true, montoNeto: true, montoExento: true },
  });
  const porPeriodo = new Map<string, number>();
  for (const d of docs) {
    if (!d.fechaEmision) continue;
    const p = aIso(d.fechaEmision).slice(0, 7);
    const signo = d.tipoDte === 61 ? -1 : 1;
    porPeriodo.set(p, (porPeriodo.get(p) ?? 0) + signo * (d.montoNeto + d.montoExento));
  }
  let ultimo = [...porPeriodo.keys()].sort().at(-1) ?? null;
  if (!ultimo) {
    const previo = await db.documentoEmitido.findFirst({ where: { ...VENTAS, fechaEmision: { not: null } }, orderBy: { fechaEmision: "desc" }, select: { fechaEmision: true } });
    if (previo?.fechaEmision) {
      ultimo = aIso(previo.fechaEmision).slice(0, 7);
      const delMes = await db.documentoEmitido.findMany({
        where: { ...VENTAS, fechaEmision: { gte: aFecha(`${ultimo}-01`), lt: aFecha(`${desde}`) } },
        select: { fechaEmision: true, tipoDte: true, montoNeto: true, montoExento: true },
      });
      for (const d of delMes) {
        if (!d.fechaEmision || aIso(d.fechaEmision).slice(0, 7) !== ultimo) continue;
        porPeriodo.set(ultimo, (porPeriodo.get(ultimo) ?? 0) + (d.tipoDte === 61 ? -1 : 1) * (d.montoNeto + d.montoExento));
      }
    }
  }
  return { porPeriodo, ultimo };
}

/**
 * Base de conversión para las cuotas entre `desde` y `hasta`. Solo consulta lo que piden las unidades presentes
 * (hasta 3 consultas de UF y 1 a 3 de ventas).
 */
export async function baseMonto(db: Lector, unidades: ReadonlySet<string>, desde: string, hasta: string): Promise<BaseMonto> {
  const [u, v] = await Promise.all([
    unidades.has("uf") ? ufs(db, desde, hasta) : Promise.resolve({ porDia: new Map<string, number>(), ultima: null }),
    unidades.has("pct_ventas") ? ventas(db, desde) : Promise.resolve({ porPeriodo: new Map<string, number>(), ultimo: null }),
  ]);
  return {
    ufDelDia: (f) => u.porDia.get(f) ?? null,
    ufUltima: u.ultima,
    ventasNetas: (p) => v.porPeriodo.get(p) ?? null,
    ultimoPeriodoConVentas: v.ultimo,
    periodoActual: hoyChile().slice(0, 7),
  };
}

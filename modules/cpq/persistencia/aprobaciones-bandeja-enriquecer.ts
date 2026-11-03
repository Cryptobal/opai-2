import type { Contexto } from "@opai/capabilities";

import { idBandejaCpq } from "./aprobaciones-bandeja-id";
import type { ItemBandejaCpq } from "./aprobaciones-bandeja-tipos";
import { MARGEN_MINIMO_PCT } from "./aprobaciones-bandeja-tipos";
import { recalcularVersion } from "./recalcular";

async function cuentaDeNegocio(ctx: Contexto, negocioId: string) {
  const n = await ctx.db.negocio.findFirst({
    where: { id: negocioId },
    select: { cuenta: { select: { nombre: true } } },
  });
  return n?.cuenta?.nombre ?? "—";
}

export async function filasMargen(ctx: Contexto, historial: boolean) {
  return ctx.db.cpqAprobacion.findMany({
    where: historial ? { NOT: { estado: "pendiente" } } : { estado: "pendiente" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      version: { include: { cotizacion: true } },
    },
  });
}

export async function filasEnvio(ctx: Contexto, historial: boolean) {
  return ctx.db.cpqPropuestaEnvio.findMany({
    where: historial
      ? { NOT: { estado: "pendiente_aprobacion" } }
      : { estado: "pendiente_aprobacion" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { propuestaTecnica: { select: { cotizacionId: true } } },
  });
}

export async function enriquecerMargen(
  ctx: Contexto,
  fila: Awaited<ReturnType<typeof filasMargen>>[number],
  nombres: Map<string, string>,
  baseUrl: string,
): Promise<ItemBandejaCpq> {
  const version = fila.version;
  const cot = version?.cotizacion;
  if (!version || !cot) {
    throw new Error("Aprobación CPQ sin versión o cotización enlazada.");
  }
  const cuenta = await cuentaDeNegocio(ctx, cot.negocioId);
  let margenEfectivoPct: number | null = null;
  let venta = version.ventaMensualClp;
  if (ctx.autorizar("cpq:costos.ver")) {
    const calc = await recalcularVersion(ctx, cot.id, fila.version.numero, false);
    if (calc) {
      margenEfectivoPct = calc.margenEfectivoPct;
      venta = calc.ventaMensual;
    }
  }
  const id = idBandejaCpq("margen", cot.id);
  const resumen = `Margen · ${cot.codigo} · ${cuenta}`;
  return {
    id,
    tipo: "margen",
    estado: fila.estado,
    resumen,
    cotizacionId: cot.id,
    codigo: cot.codigo,
    titulo: cot.titulo,
    cuentaNombre: cuenta,
    ventaMensualClp: venta,
    margenEfectivoPct,
    margenMinimoPct: MARGEN_MINIMO_PCT,
    solicitanteId: fila.solicitadaPorId,
    solicitanteNombre: nombres.get(fila.solicitadaPorId) ?? "Usuario",
    comentario: fila.comentario ?? null,
    creadaEn: fila.createdAt.toISOString(),
    resueltaEn: fila.decididaEn?.toISOString() ?? null,
    motivo: fila.motivo ?? null,
    enlaceCotizacion: `${baseUrl}/cotizaciones/${cot.id}`,
    enlaceBandeja: `${baseUrl}/configuracion/aprobaciones?ver=${encodeURIComponent(id)}`,
  };
}

export async function enriquecerEnvio(
  ctx: Contexto,
  fila: Awaited<ReturnType<typeof filasEnvio>>[number],
  nombres: Map<string, string>,
  baseUrl: string,
): Promise<ItemBandejaCpq | null> {
  const cot = await ctx.db.cpqCotizacion.findFirst({ where: { id: fila.cotizacionId } });
  if (!cot) return null;
  const version = await ctx.db.cpqVersion.findFirst({ where: { id: fila.versionId } });
  const cuenta = await cuentaDeNegocio(ctx, cot.negocioId);
  let margenEfectivoPct: number | null = null;
  let venta = version?.ventaMensualClp ?? null;
  if (ctx.autorizar("cpq:costos.ver") && version) {
    const calc = await recalcularVersion(ctx, cot.id, version.numero, false);
    if (calc) {
      margenEfectivoPct = calc.margenEfectivoPct;
      venta = calc.ventaMensual;
    }
  }
  const id = idBandejaCpq("envio", fila.id);
  const resumen = `Envío propuesta · ${cot.codigo} · ${cuenta}`;
  return {
    id,
    tipo: "envio_propuesta",
    estado: fila.estado,
    resumen,
    cotizacionId: cot.id,
    codigo: cot.codigo,
    titulo: cot.titulo,
    cuentaNombre: cuenta,
    ventaMensualClp: venta,
    margenEfectivoPct,
    margenMinimoPct: MARGEN_MINIMO_PCT,
    solicitanteId: fila.solicitadoPorId,
    solicitanteNombre: nombres.get(fila.solicitadoPorId) ?? "Usuario",
    comentario: fila.mensaje,
    creadaEn: fila.createdAt.toISOString(),
    resueltaEn: fila.enviadoEn?.toISOString() ?? null,
    motivo: null,
    enlaceCotizacion: `${baseUrl}/cotizaciones/${cot.id}`,
    enlaceBandeja: `${baseUrl}/configuracion/aprobaciones?ver=${encodeURIComponent(id)}`,
  };
}

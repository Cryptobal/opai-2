import type { Contexto } from "@opai/capabilities";

import { idBandejaCpq } from "./aprobaciones-bandeja-id";
import { recalcularVersion } from "./recalcular";

/** Margen mínimo Gard (10 % sobre venta), mismo tope que el motor en recalcular. */
const MARGEN_MINIMO_PCT = 100_000;

export type ItemBandejaCpq = {
  id: string;
  tipo: "margen" | "envio_propuesta";
  estado: string;
  resumen: string;
  cotizacionId: string;
  codigo: string;
  titulo: string;
  cuentaNombre: string;
  ventaMensualClp: number | null;
  margenEfectivoPct: number | null;
  margenMinimoPct: number;
  solicitanteId: string;
  solicitanteNombre: string;
  comentario: string | null;
  creadaEn: string;
  resueltaEn: string | null;
  motivo: string | null;
  enlaceCotizacion: string;
  enlaceBandeja: string;
};

async function nombresUsuarios(ctx: Contexto, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await ctx.db.membership.findMany({
    where: { tenantId: ctx.tenantId, userId: { in: [...new Set(ids)] } },
    include: { user: { select: { name: true } } },
  });
  return new Map(rows.map((m) => [m.userId, m.user?.name ?? "Usuario"]));
}

async function cuentaDeNegocio(ctx: Contexto, negocioId: string) {
  const n = await ctx.db.negocio.findFirst({
    where: { id: negocioId },
    select: { cuenta: { select: { nombre: true } } },
  });
  return n?.cuenta?.nombre ?? "—";
}

export async function contarPendientesBandejaCpq(ctx: Contexto) {
  let total = 0;
  if (ctx.autorizar("cpq:aprobar")) {
    total += await ctx.db.cpqAprobacion.count({ where: { estado: "pendiente" } });
  }
  if (ctx.autorizar("cpq:envios.aprobar")) {
    total += await ctx.db.cpqPropuestaEnvio.count({ where: { estado: "pendiente_aprobacion" } });
  }
  return total;
}

async function enriquecerMargen(
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
  const refId = fila.id;
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

async function filasMargen(ctx: Contexto, historial: boolean) {
  return ctx.db.cpqAprobacion.findMany({
    where: historial ? { NOT: { estado: "pendiente" } } : { estado: "pendiente" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      version: { include: { cotizacion: true } },
    },
  });
}

async function filasEnvio(ctx: Contexto, historial: boolean) {
  return ctx.db.cpqPropuestaEnvio.findMany({
    where: historial
      ? { NOT: { estado: "pendiente_aprobacion" } }
      : { estado: "pendiente_aprobacion" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { propuestaTecnica: { select: { cotizacionId: true } } },
  });
}

async function enriquecerEnvio(
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
  const refId = fila.id;
  const id = idBandejaCpq("envio", refId);
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

export async function listarBandejaCpq(ctx: Contexto, historial: boolean) {
  const baseUrl = ctx.servicios.urlBase.replace(/\/$/, "");
  const items: ItemBandejaCpq[] = [];
  const idsNombre: string[] = [];

  if (ctx.autorizar("cpq:aprobar")) {
    const filas = await filasMargen(ctx, historial);
    idsNombre.push(...filas.map((f) => f.solicitadaPorId));
    const nombres = await nombresUsuarios(ctx, idsNombre);
    for (const f of filas) items.push(await enriquecerMargen(ctx, f, nombres, baseUrl));
  }

  if (ctx.autorizar("cpq:envios.aprobar")) {
    const filas = await filasEnvio(ctx, historial);
    idsNombre.push(...filas.map((f) => f.solicitadoPorId));
    const nombres = await nombresUsuarios(ctx, idsNombre);
    for (const f of filas) {
      const item = await enriquecerEnvio(ctx, f, nombres, baseUrl);
      if (item) items.push(item);
    }
  }

  return items.sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
}

export async function obtenerBandejaCpq(ctx: Contexto, id: string) {
  const lista = await listarBandejaCpq(ctx, false);
  const hist = await listarBandejaCpq(ctx, true);
  return [...lista, ...hist].find((x) => x.id === id) ?? null;
}

import type { Contexto } from "@opai/capabilities";
import { ajuste, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";
import { type Acceso, esRol, tienePermisoEfectivo } from "@opai/domain";

import { claveDuplicado, codigoVisible, esFechaFutura, itemsSinRespaldo, type EstadoRendicion } from "../domain";
import { PERMISO_APROBAR, PERMISO_VER_TODAS } from "./permisos";

export const ID_VISTA_PREVIA = "00000000-0000-0000-0000-000000000000";

type Item = {
  fecha: string;
  proveedor: string;
  folio?: string | undefined;
  monto: number;
  documentoId?: string | undefined;
  sinRespaldoMotivo?: string | undefined;
};

/** Fecha de hoy (AAAA-MM-DD) en Chile: el gasto no puede ser posterior. */
export function hoyChile(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(ahora);
}

export function actorId(ctx: Contexto): string {
  if (!ctx.usuario) throw prohibido("Se necesita una sesión de usuario para operar rendiciones.");
  return ctx.usuario.id;
}

/** Siguiente código REN-n de la empresa; el UPDATE bloquea la fila, así que no hay códigos repetidos. */
export async function siguienteCodigo(tx: Contexto["db"], tenantId: string): Promise<number> {
  await tx.rendicionContador.createMany({ data: [{ tenantId }], skipDuplicates: true });
  const c = await tx.rendicionContador.update({ where: { tenantId }, data: { ultimo: { increment: 1 } } });
  return c.ultimo;
}

/** El centro de costo es una instalación activa de la empresa o «Administración / Oficina central». */
export async function validarCentro(ctx: Contexto, instalacionId: string | undefined): Promise<void> {
  if (!instalacionId) return;
  const inst = await ctx.db.instalacion.findFirst({ where: { id: instalacionId, estado: "activa" }, select: { id: true } });
  if (!inst) throw reglaDeNegocio("La instalación no existe o no está activa en esta empresa.");
}

/** Aprobador: miembro activo con permiso efectivo de aprobar (rol base o personalizado + excepciones). */
export async function validarAprobador(ctx: Contexto, aprobadorId: string, solicitanteId: string): Promise<void> {
  if (aprobadorId === solicitanteId) throw reglaDeNegocio("Nadie aprueba su propia rendición.");
  const m = await ctx.db.membership.findFirst({
    where: { tenantId: ctx.tenantId, userId: aprobadorId, estado: "activa" },
    include: { rolTenant: true, excepciones: true },
  });
  const personalizado = m?.rolTenant;
  const acceso: Acceso | null = m && {
    rol: personalizado || !esRol(m.rol) ? null : m.rol,
    // Un rol personalizado archivado deniega por defecto, igual que en la sesión.
    permisosRol: personalizado ? (personalizado.archivadoEn ? [] : personalizado.permisos) : null,
    excepciones: m.excepciones.map((e) => ({ permiso: e.permiso, conceder: e.conceder })),
  };
  if (!acceso || !tienePermisoEfectivo(acceso, PERMISO_APROBAR))
    throw reglaDeNegocio("El aprobador elegido no puede aprobar rendiciones en esta empresa.");
}

export async function aprobadorEfectivo(ctx: Contexto, elegido: string | undefined | null): Promise<string | null> {
  if (elegido) return elegido;
  const porDefecto = await ajuste<string>(ctx, "rendiciones", "aprobador_defecto_id");
  return porDefecto || null;
}

/** Reglas de los ítems: fecha no futura, respaldos de la empresa y respaldo según el ajuste. */
export async function validarItems(ctx: Contexto, items: readonly Item[]): Promise<void> {
  const hoy = hoyChile();
  const futura = items.findIndex((i) => esFechaFutura(i.fecha, hoy));
  if (futura >= 0) throw reglaDeNegocio(`El gasto ${futura + 1} tiene fecha futura.`);
  const ids = [...new Set(items.flatMap((i) => (i.documentoId ? [i.documentoId] : [])))];
  // N1 (Revisor): quien no ve todas las rendiciones solo adjunta respaldos que él mismo subió (ADR-022).
  // Una key de agente guarda su propio ID en creadoPorId y a su responsable en viaUserId: ambos cuentan como propios.
  const yo = actorId(ctx);
  const propios = ctx.autorizar(PERMISO_VER_TODAS) ? {} : { OR: [{ creadoPorId: yo }, { viaUserId: yo }] };
  if (ids.length > 0 && (await ctx.db.documento.count({ where: { id: { in: ids }, estado: "disponible", ...propios } })) !== ids.length)
    throw reglaDeNegocio("Un respaldo no existe entre tus documentos o aún no terminó de subirse.");
  const exigir = await ajuste<boolean>(ctx, "rendiciones", "exigir_respaldo");
  const faltan = itemsSinRespaldo(
    items.map((i) => ({ ...i, descripcion: "", tieneRespaldo: !!i.documentoId })),
    exigir,
  );
  if (faltan.length > 0) throw reglaDeNegocio(`Al gasto ${faltan[0]! + 1} le falta la boleta o un motivo para no tenerla.`);
}

/**
 * Avisos (no bloquean): la misma boleta ya rendida en otra rendición vigente. Solo mira las
 * rendiciones que el actor puede ver (ADR-022): si no, el aviso revelaría gastos y códigos ajenos.
 */
export async function avisosDuplicados(ctx: Contexto, items: readonly Item[], propiaId?: string): Promise<string[]> {
  const claves = new Map(items.flatMap((i, n) => { const k = claveDuplicado(i); return k ? [[k, n + 1] as const] : []; }));
  if (claves.size === 0) return [];
  const yo = actorId(ctx);
  const alcance = ctx.autorizar(PERMISO_VER_TODAS) ? {} : { OR: [{ solicitanteId: yo }, { aprobadorId: yo }] };
  const otros = await ctx.db.rendicionItem.findMany({
    where: {
      folio: { in: items.flatMap((i) => (i.folio ? [i.folio.trim()] : [])) },
      monto: { in: items.map((i) => i.monto) },
      rendicion: { estado: { not: "anulada" }, ...alcance, ...(propiaId ? { id: { not: propiaId } } : {}) },
    },
    select: { proveedor: true, folio: true, monto: true, rendicion: { select: { codigo: true } } },
  });
  return otros.flatMap((o) => {
    const n = claves.get(claveDuplicado(o) ?? "");
    return n ? [`El gasto ${n} parece repetido en ${codigoVisible(o.rendicion.codigo)} (mismo proveedor, folio y monto).`] : [];
  });
}

/** Si el actor puede ver la rendición: es el solicitante, el aprobador asignado o ve todas (ADR-022). */
export function puedeVer(ctx: Contexto, r: { solicitanteId: string; aprobadorId: string | null }): boolean {
  const yo = ctx.usuario?.id;
  return !!yo && (r.solicitanteId === yo || r.aprobadorId === yo || ctx.autorizar(PERMISO_VER_TODAS));
}

export async function rendicionDe(ctx: Contexto, id: string) {
  const r = await ctx.db.rendicion.findFirst({ where: { id }, include: { items: { orderBy: { orden: "asc" } }, viaje: true } });
  if (!r || !puedeVer(ctx, r)) throw noEncontrado("La rendición");
  return r;
}

type Fila = {
  id: string; codigo: number; tipo: string; estado: string; solicitanteId: string; aprobadorId: string | null;
  centroCosto: string; instalacionId: string | null; descripcion: string; montoTotal: number;
  enviadaEn: Date | null; decididaEn: Date | null; motivoDecision: string | null;
};
type ItemFila = { id: string; fecha: Date; proveedor: string; folio: string | null; descripcion: string; monto: number; documentoId: string | null; sinRespaldoMotivo: string | null };

export function resumenDe(r: Fila) {
  return {
    id: r.id, codigo: r.codigo, codigoVisible: codigoVisible(r.codigo), tipo: r.tipo, estado: r.estado as EstadoRendicion,
    solicitanteId: r.solicitanteId, aprobadorId: r.aprobadorId, centroCosto: r.centroCosto, instalacionId: r.instalacionId,
    descripcion: r.descripcion, montoTotal: r.montoTotal, enviadaEn: r.enviadaEn?.toISOString() ?? null,
    decididaEn: r.decididaEn?.toISOString() ?? null, motivoDecision: r.motivoDecision,
  };
}

type ViajeFila = {
  origenTexto: string; destinoTexto: string; km: { toNumber(): number }; idaYVuelta: boolean; peajeClp: number;
  metodo: string; origenDistancia: string; montoCalculado: number;
};

export function vistaDe(r: Fila & { items: ItemFila[]; viaje: ViajeFila | null }) {
  const v = r.viaje;
  return {
    ...resumenDe(r),
    items: r.items.map((i) => ({ ...i, fecha: i.fecha.toISOString().slice(0, 10) })),
    viaje: v && {
      origen: v.origenTexto, destino: v.destinoTexto, km: v.km.toNumber(), idaYVuelta: v.idaYVuelta, peajeClp: v.peajeClp,
      metodo: v.metodo, origenDistancia: v.origenDistancia === "google" ? ("google" as const) : ("linea_recta" as const),
      montoCalculado: v.montoCalculado,
    },
  };
}

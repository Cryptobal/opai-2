import type { z } from "zod";

import { type Contexto, noEncontrado, reglaDeNegocio } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { estadoEfectivo, type EstadoAlerta } from "../domain";
import type { alertaSchema } from "./esquemas";

export const ID_VISTA_PREVIA = "00000000-0000-7000-8000-000000000000";

/** Filtro de alcance (ADR-022, R20): un supervisor solo ve las alertas de sus instalaciones. */
export function dondeAlcance(ctx: Contexto) {
  return ctx.alcance ? { instalacionId: { in: [...ctx.alcance.instalaciones] } } : {};
}

type FilaAlerta = Awaited<ReturnType<TenantTx["centralAlerta"]["findFirstOrThrow"]>>;

export async function alertaVisible(ctx: Contexto, id: string): Promise<FilaAlerta> {
  const a = await ctx.db.centralAlerta.findFirst({ where: { id, ...dondeAlcance(ctx) } });
  if (!a) throw noEncontrado("La alerta");
  return a;
}

export function vistaAlerta(a: FilaAlerta, ahora: Date): z.infer<typeof alertaSchema> {
  const estado = estadoEfectivo(a, ahora);
  return {
    id: a.id,
    instalacionId: a.instalacionId,
    personaId: a.personaId,
    titulo: a.titulo,
    descripcion: a.descripcion,
    severidad: a.severidad as z.infer<typeof alertaSchema>["severidad"],
    origen: a.origen,
    estado,
    pospuestaHasta: estado === "pospuesta" ? a.pospuestaHasta : null,
    notaCierre: a.notaCierre,
    abiertaPorId: a.abiertaPorId,
    cerradaEn: a.cerradaEn,
    createdAt: a.createdAt,
  };
}

/** El agente de central (key de servicio) es quien solo propone estas acciones (R10). */
export function esAgenteDeServicio(ctx: Contexto) {
  return ctx.principal?.tipo === "servicio";
}

export function exigirPersona(ctx: Contexto, accion: string) {
  if (esAgenteDeServicio(ctx))
    throw reglaDeNegocio(
      `El agente de central no puede ${accion} por su cuenta: solo puede proponerlo al operador de turno (R10).`,
    );
}

type Hecho = {
  alertaId: string;
  tipo: string;
  estadoDesde: EstadoAlerta | null;
  estadoHacia: EstadoAlerta;
  nota?: string | null;
};

/** Línea de tiempo de la alerta y bitácora encadenada del núcleo, en la misma transacción (R18). */
export async function registrarHecho(ctx: Contexto, tx: TenantTx, h: Hecho) {
  const actorTipo = ctx.agente ? "agente" : ctx.usuario ? "persona" : "sistema";
  await tx.centralAlertaEvento.create({
    data: {
      tenantId: ctx.tenantId,
      alertaId: h.alertaId,
      tipo: h.tipo,
      actorTipo,
      actorId: ctx.usuario?.id ?? null,
      nota: h.nota ?? null,
      estadoDesde: h.estadoDesde,
      estadoHacia: h.estadoHacia,
    },
  });
  await ctx.bitacora.registrar(tx, {
    tipo: `central.alerta.${h.tipo}`,
    entidadTipo: "central.alerta",
    entidadId: h.alertaId,
    payload: { desde: h.estadoDesde, hacia: h.estadoHacia, actorTipo },
  });
}

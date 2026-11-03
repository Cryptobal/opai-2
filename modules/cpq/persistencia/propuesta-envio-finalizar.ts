import { reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { debeCongelarPropuestaEnEnvio } from "../domain/documento/propuesta-envio-reglas";
import { congelarPropuestaTecnica } from "./propuesta-tecnica";

/** Reserva la aprobación (una sola vez) mientras el envío sigue pendiente. */
export async function reclamarAprobacionEnvioPropuesta(
  ctx: Contexto,
  envioId: string,
  actorId: string,
) {
  await ctx.transaccion(async (tx) => {
    const reclamado = await tx.cpqPropuestaEnvio.updateMany({
      where: {
        id: envioId,
        tenantId: ctx.tenantId,
        estado: "pendiente_aprobacion",
        aprobadoPorId: null,
      },
      data: { aprobadoPorId: actorId },
    });
    if (reclamado.count !== 1) {
      throw reglaDeNegocio("El envío ya no está pendiente de aprobación.");
    }
  });
}

export async function liberarReclamoEnvioPropuesta(ctx: Contexto, envioId: string, actorId: string) {
  await ctx.db.cpqPropuestaEnvio.updateMany({
    where: {
      id: envioId,
      tenantId: ctx.tenantId,
      estado: "pendiente_aprobacion",
      aprobadoPorId: actorId,
    },
    data: { aprobadoPorId: null },
  });
}

export async function marcarEnvioPropuestaEnviado(
  ctx: Contexto,
  input: {
    envioId: string;
    cotizacionId: string;
    actorId: string;
    autoaprobacion: boolean;
    incluyeCotizacion: boolean;
    incluyePropuesta: boolean;
    propuestaTecnicaId: string | null;
    documentoCotizacionId: string | null;
    documentoPropuestaId: string | null;
    destinatarios: number;
    snapshotJson: string;
    envioDirectoDentroMargen: boolean;
    solicitadoPorId: string;
  },
) {
  await ctx.transaccion(async (tx) => {
    const actualizado = await tx.cpqPropuestaEnvio.updateMany({
      where: {
        id: input.envioId,
        tenantId: ctx.tenantId,
        estado: "pendiente_aprobacion",
        aprobadoPorId: input.actorId,
      },
      data: {
        estado: "enviado",
        enviadoEn: new Date(),
        snapshotJson: input.snapshotJson,
        documentoCotizacionId: input.documentoCotizacionId,
        documentoPropuestaId: input.documentoPropuestaId,
      },
    });
    if (actualizado.count !== 1) {
      throw reglaDeNegocio("El envío ya no está pendiente de aprobación.");
    }
    if (input.incluyePropuesta && input.propuestaTecnicaId && debeCongelarPropuestaEnEnvio(true)) {
      await congelarPropuestaTecnica(ctx, input.propuestaTecnicaId);
    }
    await ctx.eventos.emitir(tx, {
      tipo: "cpq.envio_propuesta.aprobado",
      entidadTipo: "cotizacion",
      entidadId: input.cotizacionId,
      payload: {
        envioId: input.envioId,
        autoaprobacion: input.autoaprobacion,
        envioDirectoDentroMargen: input.envioDirectoDentroMargen,
        incluyeCotizacion: input.incluyeCotizacion,
        incluyePropuesta: input.incluyePropuesta,
        destinatarios: input.destinatarios,
        solicitadoPorId: input.solicitadoPorId,
      },
    });
  });
  ctx.despacharEventos();
}

import type { Contexto } from "@opai/capabilities";
import { uuid7 } from "@opai/capabilities";

import type { SnapshotEnvioPropuesta } from "../domain/documento/propuesta-tecnica";

export async function registrarEnvioPropuesta(
  ctx: Contexto,
  input: {
    cotizacionId: string;
    versionId: string;
    propuestaTecnicaId: string | null;
    incluyeCotizacion: boolean;
    incluyePropuesta: boolean;
    destinatariosJson: string;
    snapshot: SnapshotEnvioPropuesta;
    mensaje?: string;
    solicitadoPorId: string;
    documentoCotizacionId?: string;
    documentoPropuestaId?: string;
    enviado: boolean;
    aprobadoPorId?: string;
  },
) {
  const ahora = input.enviado ? new Date() : null;
  return ctx.db.cpqPropuestaEnvio.create({
    data: {
      id: uuid7(),
      tenantId: ctx.tenantId,
      cotizacionId: input.cotizacionId,
      versionId: input.versionId,
      propuestaTecnicaId: input.propuestaTecnicaId,
      estado: input.enviado ? "enviado" : "pendiente_aprobacion",
      incluyeCotizacion: input.incluyeCotizacion,
      incluyePropuesta: input.incluyePropuesta,
      destinatariosJson: input.destinatariosJson,
      snapshotJson: JSON.stringify(input.snapshot),
      mensaje: input.mensaje ?? null,
      solicitadoPorId: input.solicitadoPorId,
      aprobadoPorId: input.aprobadoPorId ?? null,
      enviadoEn: ahora,
      documentoCotizacionId: input.documentoCotizacionId ?? null,
      documentoPropuestaId: input.documentoPropuestaId ?? null,
    },
  });
}

export async function listarEnviosPropuesta(ctx: Contexto, cotizacionId: string) {
  return ctx.db.cpqPropuestaEnvio.findMany({
    where: { tenantId: ctx.tenantId, cotizacionId },
    orderBy: { createdAt: "desc" },
  });
}

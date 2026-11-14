// Responder las solicitudes de permiso y vacaciones que la persona hace desde su portal (CAR-508; referente BambooHR /
// Rippling / Deel: la solicitud llega a quien gestiona a la persona, que la aprueba o la rechaza). Aprobar es lo mismo
// que registrar desde la ficha: con Pauta marca los turnos de esas fechas. Rechazar solo cierra la solicitud.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { escribirAusencia, salidaAusencia } from "../../pauta/ausencias-escribir";
import { personaParaAusencia } from "../../pauta/ausencias-plan";
import { fechaIso } from "../../pauta/comun";
import { tipoExcepcionSchema } from "../../pauta/vistas";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";

const entrada = z.object({ personaId: uuidSchema, ausenciaId: uuidSchema });

/** La solicitud pendiente de la persona en el alcance del actor, o un error sin enumerar. */
async function solicitud(ctx: Contexto, { personaId, ausenciaId }: z.output<typeof entrada>) {
  await personaParaAusencia(ctx, personaId);
  const a = await ctx.db.ausencia.findFirst({
    where: { id: ausenciaId, personaId },
    select: { estado: true, tipo: true, desde: true, hasta: true, motivo: true, clase: true },
  });
  if (!a) throw noEncontrado("La solicitud");
  if (a.estado !== "solicitada") throw reglaDeNegocio("La solicitud ya fue respondida o retirada.");
  return a;
}

export const ausenciasAprobar = defineCapability({
  id: "core.ausencias.aprobar",
  descripcion:
    "Aprueba una solicitud de permiso o vacaciones que la persona hizo desde su portal. Queda registrada como cualquier ausencia y, si la empresa usa la pauta, marca los turnos que la persona tiene como titular en esas fechas.",
  permiso: PERMISOS_CORE.personasLaboralManage,
  input: entrada,
  output: salidaAusencia,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const a = await solicitud(ctx, input);
    return escribirAusencia(
      ctx,
      {
        personaId: input.personaId,
        tipo: tipoExcepcionSchema.parse(a.tipo),
        motivo: a.motivo,
        ...(a.clase ? { clase: a.clase } : {}),
        desde: fechaIso(a.desde),
        hasta: fechaIso(a.hasta),
      },
      {
        dryRun,
        conPauta: ctx.modulosActivos.includes("pauta"),
        exigirTurnos: false,
        exigirPermisoPauta: true,
        solicitudId: input.ausenciaId,
      },
    );
  },
});

export const ausenciasRechazar = defineCapability({
  id: "core.ausencias.rechazar",
  descripcion:
    "Rechaza una solicitud de permiso o vacaciones que la persona hizo desde su portal. No toca la pauta; la solicitud queda en el historial como rechazada y la persona lo ve en su portal.",
  permiso: PERMISOS_CORE.personasLaboralManage,
  input: entrada,
  output: z.object({ ausenciaId: z.string(), estado: z.literal("rechazada") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const salida = { ausenciaId: input.ausenciaId, estado: "rechazada" as const };
    if (dryRun) {
      await solicitud(ctx, input);
      return salida;
    }
    return ctx.transaccion(async (tx) => {
      // Mismo cerrojo que aprobar, retirar y la pauta: no se cruza con una respuesta simultánea.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pauta:${ctx.tenantId}:${input.personaId}`}, 0))::text`;
      await solicitud({ ...ctx, db: tx }, input);
      const usuario = ctx.usuario?.id ?? null;
      // Sin columnas propias del rechazo: quién y cuándo cerró la solicitud quedan en anulada_por/en y en la auditoría.
      await tx.ausencia.update({
        where: { id: input.ausenciaId },
        data: { estado: "rechazada", anuladaPor: usuario, anuladaEn: new Date() },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.ausencia.respondida",
        entidadTipo: "persona",
        entidadId: input.personaId,
        payload: { ...salida, personaId: input.personaId },
      });
      return salida;
    });
  },
});

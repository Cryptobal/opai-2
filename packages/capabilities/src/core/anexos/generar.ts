import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { crearBorrador } from "./comun";
import { validarSnapshots } from "./validar-snapshots";
import { anexoSchema, MOTIVOS_ANEXO, vistaAnexo } from "./vista";
import { idAutor } from "../../autor";

const snapshotLibre = z
  .record(z.string(), z.unknown())
  .refine((v) => JSON.stringify(v).length <= 5_000, "El detalle del cambio es demasiado grande.");

export const anexosGenerar = defineCapability({
  id: "core.anexos.generar",
  descripcion:
    "Genera a mano el borrador de un anexo de contrato para una persona (capa, monto, instalación o rol): los cambios hechos por capacidades del núcleo ya lo generan solos vía el evento de outbox.",
  permiso: PERMISOS_CORE.anexosManage,
  input: z.object({
    personaId: z.uuid(),
    motivoCambio: z.enum(MOTIVOS_ANEXO),
    snapshotAntes: snapshotLibre.nullable().default(null),
    snapshotDespues: snapshotLibre,
  }),
  output: anexoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const vinculo = await validarSnapshots(ctx, input.personaId, [
      input.snapshotAntes,
      input.snapshotDespues,
    ]);
    if (dryRun) {
      return vistaAnexo({
        id: "",
        personaId: input.personaId,
        vinculoId: vinculo.id,
        motivoCambio: input.motivoCambio,
        snapshotAntes: input.snapshotAntes,
        snapshotDespues: input.snapshotDespues,
        generadoPorTipo: ctx.actor.tipo === "agent" ? "agente" : "usuario",
        generadoPorId: idAutor(ctx.actor),
        estado: "borrador",
        aprobadoPorId: null,
        aprobadoEn: null,
        rechazadoPorId: null,
        rechazadoEn: null,
        motivoRechazo: null,
        documentoId: null,
        createdAt: new Date(),
      });
    }
    const creado = await ctx.transaccion((tx) =>
      crearBorrador(ctx, tx, {
        personaId: input.personaId,
        vinculoId: vinculo.id,
        motivoCambio: input.motivoCambio,
        snapshotAntes: input.snapshotAntes,
        snapshotDespues: input.snapshotDespues,
        generadoPorTipo: ctx.actor.tipo === "agent" ? "agente" : "usuario",
        generadoPorId: idAutor(ctx.actor),
        origenEventoId: null,
      }),
    );
    return vistaAnexo(creado);
  },
});

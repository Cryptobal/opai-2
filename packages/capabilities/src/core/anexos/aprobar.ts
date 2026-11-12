import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { anexoDe } from "./comun";
import { validarSnapshots } from "./validar-snapshots";
import { MENSAJE_PLANTILLA_EJEMPLO, PLANTILLA_ANEXO } from "./plantilla";
import { materializarDocumento, prepararArchivoAnexo } from "./materializar";
import { plantillaAnexoPublicada } from "./plantilla-laboral";
import { anexoSchema, vistaAnexo } from "./vista";

/** Serializa la aprobación/rechazo de un mismo anexo, dentro de la transacción de ejecución. */
async function bloquearAnexo(ctx: Contexto, id: string) {
  await ctx.transaccion(
    (tx) => tx.$queryRaw`
    /* 07b:bloqueo-anexo */
    SELECT id FROM core.anexos_contrato WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${id}::uuid FOR UPDATE
  `,
  );
}

export const anexosAprobar = defineCapability({
  id: "core.anexos.aprobar",
  // Solo personas: aprobar materializa un documento irreversible (ADR-032); un agente no lo aprueba.
  soloPersonas: true,
  descripcion:
    "IRREVERSIBLE: aprueba el anexo de contrato en borrador, genera el documento final con la plantilla base y la marca del tenant y lo deja en Documentos con su huella SHA-256 (R15). Solo personas, nunca API keys.",
  permiso: PERMISOS_CORE.anexosManage,
  input: z.object({ id: z.uuid() }),
  output: anexoSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    // CAR-58: con la plantilla de ejemplo un anexo aprobado no tiene validez laboral; ni la vista previa.
    if (PLANTILLA_ANEXO.esEjemplo && !(await plantillaAnexoPublicada(ctx))) throw reglaDeNegocio(MENSAJE_PLANTILLA_EJEMPLO);
    if (dryRun) {
      const a = await anexoDe(ctx, input.id);
      if (a.estado !== "borrador") throw conflicto("El anexo ya fue resuelto.");
      await validarSnapshots(ctx, a.personaId, [a.snapshotAntes, a.snapshotDespues], a.vinculoId);
      return vistaAnexo({
        ...a,
        estado: "aprobado",
        aprobadoPorId: ctx.actor.id ?? null,
        aprobadoEn: new Date(),
        documentoId: "(se crea al aprobar)",
      });
    }
    await bloquearAnexo(ctx, input.id);
    const a = await anexoDe(ctx, input.id);
    if (a.estado !== "borrador") throw conflicto("El anexo ya fue resuelto.");
    await validarSnapshots(ctx, a.personaId, [a.snapshotAntes, a.snapshotDespues], a.vinculoId, {
      bloquear: true,
    });
    const persona = await ctx.db.persona.findUnique({ where: { id: a.personaId } });
    if (!persona) throw noEncontrado("La persona");
    const archivo = await prepararArchivoAnexo(ctx, a, persona);
    const r = await ctx.transaccion(async (tx) => {
      const doc = await materializarDocumento(ctx, tx, a, persona, archivo);
      const actualizado = await tx.anexoContrato.update({
        where: { id: a.id },
        data: {
          estado: "aprobado",
          aprobadoPorId: ctx.actor.id ?? null,
          aprobadoEn: new Date(),
          documentoId: doc.id,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.anexo.aprobado",
        entidadTipo: "anexo",
        entidadId: a.id,
        payload: { personaId: a.personaId, documentoId: doc.id },
      });
      return actualizado;
    });
    return vistaAnexo(r);
  },
});

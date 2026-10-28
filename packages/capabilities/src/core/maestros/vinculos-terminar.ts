import { uuidSchema } from "../esquemas";
import { z } from "zod";
import { PERMISOS_CORE } from "@opai/domain";
import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { aFecha, diaSchema, escribirConEvento } from "./comun";
import { vinculoSchema, vistaVinculo } from "./vinculos-vista";
import { vinculoDe } from "./vinculos";
import { bloquearVinculo, exigirEdicionVinculo } from "./vinculos-validacion";

export const vinculosTerminar = defineCapability({
  id: "core.vinculos.terminar",
  descripcion:
    "IRREVERSIBLE: termina un vínculo laboral con fecha de término y motivo. Si no le quedan vínculos vigentes, la persona pasa a inactiva.",
  permiso: PERMISOS_CORE.vinculosManage,
  input: z.object({
    id: uuidSchema,
    termino: diaSchema,
    motivo: z.string().trim().min(5).max(500),
  }),
  output: vinculoSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigirEdicionVinculo(ctx);
    if (!dryRun) await bloquearVinculo(ctx, input.id);
    const v = await vinculoDe(ctx, input.id);
    if (v.estado !== "vigente") throw reglaDeNegocio("El vínculo ya está terminado.");
    const termino = aFecha(input.termino);
    if (termino < v.inicio) throw reglaDeNegocio("El término es anterior al inicio del vínculo.");
    const data = { termino, motivoTermino: input.motivo, estado: "terminado" };
    if (dryRun) return vistaVinculo({ ...v, ...data });
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.vinculo.terminado",
        entidadTipo: "vinculo",
        payload: () => ({ personaId: v.personaId, termino: input.termino }),
      },
      async (tx) => {
        const t = await tx.vinculoLaboral.update({ where: { id: v.id }, data });
        const quedan = await tx.vinculoLaboral.count({
          where: { personaId: v.personaId, estado: "vigente" },
        });
        if (!quedan)
          await tx.persona.update({ where: { id: v.personaId }, data: { estado: "inactiva" } });
        return t;
      },
    );
    return vistaVinculo(r);
  },
});

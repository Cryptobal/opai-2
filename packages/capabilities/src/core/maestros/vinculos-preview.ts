import { z } from "zod";
import { PERMISOS_CORE } from "@opai/domain";
import { defineCapability } from "../../define";
import { noEncontrado, prohibido } from "../../errores";
import { dondePersona } from "./alcance";
import { estructurasEfectiva } from "./estructuras-efectiva";
import { validarDestino } from "./vinculos-validacion";

export const vinculosPrevisualizar = defineCapability({
  id: "core.vinculos.previsualizar",
  descripcion:
    "Compara la capa de sueldo vigente y la propuesta al cambiar instalación o puesto del vínculo, sin guardar cambios.",
  permiso: PERMISOS_CORE.vinculosRead,
  input: z.object({
    personaId: z.uuid(),
    instalacionId: z.uuid(),
    puestoId: z.uuid().nullable().optional(),
  }),
  output: z.object({ antes: estructurasEfectiva.output, despues: estructurasEfectiva.output }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [
    ...new Set(
      [s.antes, s.despues].flatMap((v) =>
        Object.values(v.niveles).flatMap((e) => (e ? [e.id] : [])),
      ),
    ),
  ],
  async handler(ctx, input) {
    if (!ctx.autorizar(PERMISOS_CORE.estructurasRead))
      throw prohibido("Sin permiso para consultar capas de sueldo.");
    const p = await ctx.db.persona.findFirst({
      where: { id: input.personaId, AND: [dondePersona(ctx)] },
    });
    if (!p) throw noEncontrado("La persona");
    // La comparación permite elegir destino aun al crear el primer vínculo.
    await validarDestino(ctx, { ...input, horasSemanales: 1, distribucion: "Vista previa" });
    const modo = { dryRun: false };
    const antes = await estructurasEfectiva.handler(ctx, { personaId: p.id }, modo);
    const despues = await estructurasEfectiva.handler(
      ctx,
      {
        personaId: p.id,
        instalacionId: input.instalacionId,
        ...(input.puestoId ? { puestoId: input.puestoId } : {}),
      },
      modo,
    );
    return { antes, despues };
  },
});

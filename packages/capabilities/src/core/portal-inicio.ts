import { z } from "zod";

import { conflicto, noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import { escribirConEvento } from "./maestros/comun";
import { usuarioResponsable } from "./comun";
import { defineCapability } from "../define";
import { portalSchema } from "./esquemas";

/**
 * Portal donde la persona entra al abrir esta empresa o cambiarse a ella (NÚCLEO-D1). Cada uno elige
 * el suyo entre los portales de SU membresía actual; `null` vuelve al primero permitido. El admin fija
 * el de otra persona al invitar, sin poder elegir un portal ajeno.
 */
export const mePortalInicio = defineCapability({
  id: "core.me.portal_inicio",
  descripcion:
    "Fija el portal donde entrar al abrir esta empresa o cambiarte a ella (debe ser uno de tus portales); null vuelve al primero permitido.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador", "terreno"],
  input: z.object({ portal: portalSchema.nullable() }),
  output: z.object({ portalInicio: z.string().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (ctx.principal && ctx.principal.tipo !== "usuario")
      throw prohibido("Solo para una membresía de usuario.");
    const userId = usuarioResponsable(ctx);
    const membresia = await ctx.db.membership.findUnique({
      where: { tenantId_userId: { tenantId: ctx.tenantId, userId } },
    });
    if (!membresia || membresia.estado !== "activa")
      throw noEncontrado("Tu membresía en esta empresa");
    if (input.portal && !membresia.portales.includes(input.portal)) {
      throw reglaDeNegocio(`No tienes el portal "${input.portal}" en esta empresa.`);
    }
    if (!dryRun) {
      await escribirConEvento(
        ctx,
        { tipo: "core.membresia.portal_inicio_fijado", entidadTipo: "membership" },
        async (tx) => {
          const r = await tx.membership.updateMany({
            where: {
              id: membresia.id,
              tenantId: ctx.tenantId,
              userId,
              estado: "activa",
              ...(input.portal ? { portales: { has: input.portal } } : {}),
            },
            data: { portalInicio: input.portal },
          });
          if (r.count !== 1) throw conflicto("La membresía cambió. Recarga y vuelve a intentarlo.");
          return { id: membresia.id };
        },
      );
    }
    return { portalInicio: input.portal };
  },
});

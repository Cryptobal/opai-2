import { z } from "zod";
import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, prohibido, rechazoSensible, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "./comun";
import { ocultarMontos } from "./estructuras-acceso";
import { dondeEstructura } from "./estructuras-alcance";
import { bloquearCapa } from "./estructuras-bloqueo";
import { estructuraSchema, vistaEstructura } from "./estructuras-vista";

export const estructurasAnular = defineCapability({
  id: "core.estructuras.anular",
  descripcion:
    "IRREVERSIBLE: anula una versión de sueldo con motivo. No reabre versiones anteriores. Emite el cambio por outbox para el anexo del PR 4.",
  permiso: PERMISOS_CORE.estructurasManage,
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(5).max(500) }),
  output: estructuraSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (ctx.rol !== "owner" && ctx.rol !== "admin")
      throw prohibido("Solo owner y admin pueden cambiar capas de sueldo.");
    if (!ctx.autorizar(PERMISOS_CORE.estructurasReadSensible))
      throw rechazoSensible("No tienes permiso para anular versiones de esta capa de sueldo.");
    return ctx.transaccion(async (tx) => {
      ctx = { ...ctx, db: tx, transaccion: (fn) => fn(tx) };
      const where = { id: input.id, AND: [await dondeEstructura(ctx)] };
      const inicial = await tx.estructuraSueldo.findFirst({ where });
      if (!inicial) throw noEncontrado("La estructura");
      const ref = inicial.instalacionId ?? inicial.puestoId ?? inicial.personaId ?? inicial.cargoId;
      if (!ref) throw noEncontrado("La estructura");
      await bloquearCapa(tx, ctx.tenantId, inicial.nivel, ref);
      const e = await tx.estructuraSueldo.findFirst({ where });
      if (!e) throw noEncontrado("La estructura");
      if (e.nivel === "cargo")
        throw prohibido("El nivel cargo fue retirado; sus estructuras son de solo lectura.");
      if (e.estado === "anulada") throw reglaDeNegocio("La estructura ya está anulada.");
      const items = await tx.estructuraItem.findMany({
        where: { estructuraId: e.id },
        orderBy: { orden: "asc" },
      });
      const data = {
        estado: "anulada",
        motivo: `${e.motivo ? `${e.motivo} · ` : ""}Anulada: ${input.motivo}`,
      };
      const ocultar = await ocultarMontos(ctx, e);
      if (dryRun) return vistaEstructura({ ...e, ...data }, items, ocultar);
      const r = await escribirConEvento(
        ctx,
        {
          tipo: "core.estructura.anulada",
          entidadTipo: "estructura",
          payload: () => ({ nivel: e.nivel, ref, motivo: input.motivo, anterior: e.id }),
        },
        (tx) => tx.estructuraSueldo.update({ where: { id: e.id }, data }),
      );
      return vistaEstructura(r, items, ocultar);
    });
  },
});

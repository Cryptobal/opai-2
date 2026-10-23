import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { iso, requierePlataforma } from "./comun";
import { uuidSchema } from "./esquemas";

const trabajoSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  estado: z.string(),
  intentos: z.number(),
  programadoPara: z.string().nullable(),
  ultimoError: z.string().nullable(),
});

async function trabajoDe(
  ctx: Parameters<typeof requierePlataforma>[0],
  tenantId: string,
  id: string,
) {
  const t = await requierePlataforma(ctx)
    .paraTenant(tenantId)
    .trabajo.findUnique({ where: { id } });
  if (!t) throw noEncontrado("El trabajo");
  return t;
}

export const platformTrabajosReintentar = defineCapability({
  id: "platform.trabajos.reintentar",
  descripcion:
    "Plataforma: vuelve a poner en cola un trabajo fallido o cancelado de una empresa, con los intentos en cero.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema, trabajoId: uuidSchema }),
  output: trabajoSchema,
  efecto: "escritura",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input, { dryRun }) {
    const t = await trabajoDe(ctx, input.tenantId, input.trabajoId);
    if (!["fallido", "cancelado"].includes(t.estado)) {
      throw reglaDeNegocio("Solo se reintentan trabajos fallidos o cancelados.");
    }
    const data = {
      estado: "pendiente",
      intentos: 0,
      programadoPara: new Date(),
      ultimoError: null,
    };
    const r = dryRun
      ? { ...t, ...data }
      : await requierePlataforma(ctx)
          .paraTenant(input.tenantId)
          .trabajo.update({ where: { id: t.id }, data });
    return { ...r, programadoPara: iso(r.programadoPara) };
  },
});

export const platformTrabajosCancelar = defineCapability({
  id: "platform.trabajos.cancelar",
  descripcion: "Plataforma: cancela un trabajo pendiente de una empresa. No se ejecutará.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema, trabajoId: uuidSchema }),
  output: trabajoSchema,
  efecto: "irreversible",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input, { dryRun }) {
    const t = await trabajoDe(ctx, input.tenantId, input.trabajoId);
    if (t.estado !== "pendiente") throw reglaDeNegocio("Solo se cancelan trabajos pendientes.");
    if (!dryRun) {
      // Condicionado al estado: si un runner lo reclamó entre la lectura y aquí, no se cancela.
      const { count } = await requierePlataforma(ctx)
        .paraTenant(input.tenantId)
        .trabajo.updateMany({
          where: { id: t.id, estado: "pendiente" },
          data: { estado: "cancelado" },
        });
      if (count === 0) throw reglaDeNegocio("El trabajo ya no está pendiente.");
    }
    return { ...t, estado: "cancelado", programadoPara: iso(t.programadoPara) };
  },
});

import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { requierePlataforma } from "./comun";
import { uuidSchema } from "./esquemas";

/** Enciende o apaga que la empresa reciba activos los módulos que se agreguen al catálogo. */
export const platformTenantsSetModulosNuevos = defineCapability({
  id: "platform.tenants.set_modulos_nuevos",
  descripcion:
    "Plataforma: enciende o apaga que una empresa reciba activos los módulos nuevos del catálogo. Apagado por defecto. No activa los que ya existían.",
  permiso: PERMISOS_PLATAFORMA.modulesManage,
  sinTenant: true,
  input: z.object({ tenantId: uuidSchema, activo: z.boolean() }),
  output: z.object({
    tenantId: z.string(),
    activarModulosNuevos: z.boolean(),
    anterior: z.boolean(),
  }),
  efecto: "escritura",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  cambio: (s) => ({ antes: s.anterior, despues: s.activarModulosNuevos }),
  async handler(ctx, input, { dryRun }) {
    const p = requierePlataforma(ctx);
    const fila = await p.globales.tenantModulosNuevos(input.tenantId);
    if (!fila) throw noEncontrado("La empresa");
    const anterior = fila.activarModulosNuevosDesde != null;
    if (!dryRun && anterior !== input.activo) {
      await p.globales.fijarModulosNuevosDesde(input.tenantId, input.activo ? new Date() : null);
    }
    return { tenantId: input.tenantId, activarModulosNuevos: input.activo, anterior };
  },
});

import { z } from "zod";
import { PERMISOS_CORE } from "@opai/domain";
import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "./comun";
import { cargoDe, cargoSchema, conteos, vista } from "./cargos-vista";

export const cargosSetActivo = defineCapability({
  id: "core.cargos.set_activo",
  descripcion:
    "Activa o desactiva un cargo. Desactivar no borra: impide usarlo en puestos y vínculos nuevos.",
  permiso: PERMISOS_CORE.estructurasManage,
  input: z.object({ id: uuidSchema, activo: z.boolean() }),
  output: cargoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, activo }, { dryRun }) {
    const actual = await cargoDe(ctx, id);
    const n = await conteos(ctx, id);
    if (dryRun) return vista({ ...actual, activo }, n);
    const c = await escribirConEvento(
      ctx,
      { tipo: "core.cargo.actualizado", entidadTipo: "cargo", payload: () => ({ activo }) },
      (tx) => tx.cargo.update({ where: { id }, data: { activo } }),
    );
    return vista(c, n);
  },
});

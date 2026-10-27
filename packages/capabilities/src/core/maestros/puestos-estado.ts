import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "./comun";
import { puestoDe } from "./puestos-ayuda";
import { puestoSchema, vistaPuesto } from "./puestos-vista";

export const puestosSetEstado = defineCapability({
  id: "core.puestos.set_estado",
  descripcion: "Activa o desactiva un puesto de servicio. Desactivar no borra su historial.",
  permiso: PERMISOS_CORE.instalacionesManage,
  input: z.object({ id: uuidSchema, estado: z.enum(["activo", "inactivo"]) }),
  output: puestoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, estado }, { dryRun }) {
    const actual = await puestoDe(ctx, id);
    if (dryRun) return vistaPuesto({ ...actual, estado });
    const p = await escribirConEvento(
      ctx,
      { tipo: "core.puesto.actualizado", entidadTipo: "puesto", payload: () => ({ estado }) },
      (tx) => tx.puesto.update({ where: { id }, data: { estado } }),
    );
    return vistaPuesto(await puestoDe(ctx, p.id));
  },
});

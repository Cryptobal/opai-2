import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { escribirConEvento } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { instalacionesDeLaCuenta, unAcceso } from "./accesos-comun";
import { accesoVistaSchema, type AccesoVista } from "./accesos-vista";
import { PERMISO_ACCESOS_MANAGE, estadoAccesoSchema, instalacionesDeCuenta } from "./comun";

export const accesosActualizar = defineCapability({
  id: "portal_cliente.accesos.actualizar",
  descripcion:
    "Cambia el acceso de un contacto al Portal Cliente: lo suspende, lo reactiva o lo revoca, o fija qué instalaciones de su cuenta puede ver. Los cambios rigen al instante. Un agente queda en aprobación humana.",
  permiso: PERMISO_ACCESOS_MANAGE,
  input: z.object({
    accesoId: uuidSchema,
    estado: estadoAccesoSchema.optional(),
    todasInstalaciones: z.boolean().optional(),
    instalacionIds: z.array(uuidSchema).max(200).optional(),
  }),
  output: accesoVistaSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const fila = await ctx.db.accesoCliente.findUnique({ where: { id: input.accesoId } });
    if (!fila) throw noEncontrado("El acceso");
    if (fila.estado === "revocado")
      throw reglaDeNegocio("El acceso está revocado: vincula al usuario de nuevo para devolvérselo.");
    const instalaciones =
      input.instalacionIds === undefined
        ? undefined
        : await instalacionesDeLaCuenta(ctx, fila.cuentaId, input.instalacionIds);
    const actual = await unAcceso(ctx, fila.cuentaId, fila.id);
    const nombres = new Map((await instalacionesDeCuenta(ctx, fila.cuentaId)).map((i) => [i.id, i.nombre]));
    const vista: AccesoVista = {
      ...actual,
      estado: input.estado ?? actual.estado,
      todasInstalaciones: input.todasInstalaciones ?? actual.todasInstalaciones,
      instalaciones: instalaciones
        ? instalaciones.map((id) => ({ id, nombre: nombres.get(id) ?? "" }))
        : actual.instalaciones,
    };
    if (dryRun) return vista;
    await escribirConEvento(
      ctx,
      {
        tipo: "portal_cliente.acceso.actualizado",
        entidadTipo: "cuenta",
        payload: () => ({ cuentaId: fila.cuentaId, membershipId: fila.membershipId }),
      },
      async (tx) => {
        const a = await tx.accesoCliente.update({
          where: { id: fila.id },
          data: {
            ...(input.estado === undefined ? {} : { estado: input.estado }),
            ...(input.todasInstalaciones === undefined ? {} : { todasInstalaciones: input.todasInstalaciones }),
          },
        });
        if (instalaciones) {
          await tx.accesoInstalacion.deleteMany({ where: { accesoId: fila.id } });
          if (instalaciones.length > 0)
            await tx.accesoInstalacion.createMany({
              data: instalaciones.map((instalacionId) => ({
                tenantId: ctx.tenantId,
                accesoId: fila.id,
                instalacionId,
              })),
            });
        }
        return a;
      },
    );
    return vista;
  },
});

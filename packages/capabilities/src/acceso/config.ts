import { z } from "zod";

import { configEfectiva } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { instalacionEnAlcance } from "../rondas/comun";
import { esUnica, PERMISO_READ, quien } from "./comun";
import { configSchema, leerConfig, PERMISO_CONFIG } from "./config-comun";

const salida = z.object({
  ambito: z.enum(["empresa", "instalacion"]),
  /** La instalación tiene su propia configuración (si no, hereda la de la empresa). */
  personalizada: z.boolean(),
  efectiva: configSchema,
});

export const configObtener = defineCapability({
  id: "acceso.config.get",
  descripcion:
    "Lee la configuración de Control de acceso de la empresa o, con instalacionId, la que rige en esa instalación: tipos de ingreso habilitados, campos del formulario de la portería, validación del RUT, si se permiten ingresos fuera de lista, permanencia máxima y hora de cierre automático. Dice si la instalación la personalizó o hereda la de la empresa.",
  permiso: PERMISO_READ,
  input: z.object({ instalacionId: uuidSchema.optional() }),
  output: salida,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { instalacionId }) {
    if (instalacionId) await instalacionEnAlcance(ctx, instalacionId);
    const c = await leerConfig(ctx, instalacionId ?? null);
    return {
      ambito: instalacionId ? ("instalacion" as const) : ("empresa" as const),
      personalizada: c.instalacion !== null,
      efectiva: configEfectiva(c.empresa, c.instalacion),
    };
  },
});

export const configCambiar = defineCapability({
  id: "acceso.config.set",
  descripcion:
    "Cambia la configuración de Control de acceso de la empresa o, con instalacionId, la de una instalación, que reemplaza entera a la de la empresa. Con config en null la instalación vuelve a heredar la de la empresa (y la empresa, a la de fábrica). Activar «permitir ingresos fuera de lista» queda en el registro de auditoría. Un agente necesita aprobación humana.",
  permiso: PERMISO_CONFIG,
  input: z.object({ instalacionId: uuidSchema.optional(), config: configSchema.nullable() }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, { instalacionId, config }, { dryRun }) {
    if (instalacionId) await instalacionEnAlcance(ctx, instalacionId);
    const ambito = instalacionId ? "instalacion" : "empresa";
    const antes = await leerConfig(ctx, instalacionId ?? null);
    const resultado = {
      ambito,
      personalizada: instalacionId !== undefined && config !== null,
      efectiva: instalacionId
        ? configEfectiva(antes.empresa, config)
        : configEfectiva(config, null),
    } as const;
    if (dryRun) return resultado;
    const actual = await ctx.db.configAcceso.findFirst({
      where: { instalacionId: instalacionId ?? null },
      select: { id: true },
    });
    if (config === null) {
      if (actual) await ctx.db.configAcceso.delete({ where: { id: actual.id } });
      return resultado;
    }
    const datos = { valor: config, actualizadoPor: quien(ctx) };
    if (actual) await ctx.db.configAcceso.update({ where: { id: actual.id }, data: datos });
    else
      await ctx.db.configAcceso
        .create({
          data: { ...datos, tenantId: ctx.tenantId, instalacionId: instalacionId ?? null },
        })
        .catch((e: unknown) => {
          if (esUnica(e))
            throw reglaDeNegocio("Otra persona guardó la configuración. Vuelve a intentarlo.");
          throw e;
        });
    return resultado;
  },
});

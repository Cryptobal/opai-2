import { z } from "zod";

import { ajuste, defineCapability } from "@opai/capabilities";

import { uuidSchema } from "./esquemas";
import { PERMISO_CONFIG } from "./permisos";
import { actorId } from "./util";

export const nominaCuentasOrigen = defineCapability({
  id: "rendiciones.nomina.cuentas_origen",
  descripcion:
    "Lista las cuentas bancarias de la empresa ya ingresadas en Bancos (banco y número de cuenta de la empresa, no de personas) entre las que se elige la cuenta de origen de la nómina Santander, y cuál está elegida. La elección se guarda con core.config.set en la clave nomina_cuenta_origen_id del módulo rendiciones.",
  permiso: PERMISO_CONFIG,
  portales: ["erp"],
  input: z.object({}),
  output: z.object({
    cuentas: z.array(z.object({ id: uuidSchema, banco: z.string(), numeroVisible: z.string() })),
    seleccionadaId: z.string().describe("Vacío si aún no se eligió."),
  }),
  efecto: "lectura",
  dryRun: false,
  // Cuentas de la empresa, no datos personales: perfil sin IDs de personas.
  auditarLectura: (s) => s.cuentas.map((c) => c.id),
  async handler(ctx) {
    actorId(ctx);
    const cuentas = await ctx.db.cuentaBancaria.findMany({
      where: { activa: true }, orderBy: [{ banco: "asc" }, { numeroVisible: "asc" }], take: 50,
      select: { id: true, banco: true, numeroVisible: true },
    });
    return { cuentas, seleccionadaId: await ajuste<string>(ctx, "rendiciones", "nomina_cuenta_origen_id") };
  },
});

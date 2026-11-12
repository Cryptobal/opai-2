import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { PERMISO_BANCOS_VER } from "./permisos";

export const bancosDestinosListar = defineCapability({
  id: "finanzas.bancos.destinos",
  descripcion:
    "Lista a dónde se puede conciliar un movimiento sin factura: las filas activas del flujo de caja (ingresos y egresos) y las cuentas contables de movimiento activas.",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({}),
  output: z.object({
    filas: z.array(z.object({ id: z.string(), seccion: z.enum(["ingreso", "egreso"]), etiqueta: z.string() })),
    cuentas: z.array(z.object({ id: z.string(), codigo: z.string(), nombre: z.string() })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const [filas, cuentas] = await Promise.all([
      ctx.db.flujoFila.findMany({
        where: { activa: true },
        orderBy: [{ seccion: "asc" }, { orden: "asc" }, { etiqueta: "asc" }],
        select: { id: true, seccion: true, etiqueta: true },
      }),
      ctx.db.cuentaContable.findMany({
        where: { activa: true, aceptaAsientos: true },
        orderBy: { codigo: "asc" },
        select: { id: true, codigo: true, nombre: true },
      }),
    ]);
    return { filas: filas.map((f) => ({ ...f, seccion: f.seccion === "ingreso" ? ("ingreso" as const) : ("egreso" as const) })), cuentas };
  },
});

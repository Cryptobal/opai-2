import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { movimientoSchema, montoDe } from "./esquemas";
import { PERMISO_BANCOS_VER } from "./permisos";
import { aIso } from "./util";

const estados = z.enum(["pendiente", "sugerido", "conciliado", "por_autorizar", "ignorado"]);

export const bancosMovimientosListar = defineCapability({
  id: "finanzas.movimientos_bancarios.listar",
  descripcion: "Lista movimientos bancarios de una cuenta con filtro por estado de conciliación.",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({
    cuentaId: z.uuid(),
    estado: estados.optional(),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({ items: z.array(movimientoSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((i) => i.id),
  async handler(ctx, input) {
    const items = await ctx.db.movimientoBancario.findMany({
      where: { cuentaId: input.cuentaId, ...(input.estado ? { estado: input.estado } : {}) },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: input.limite,
    });
    return {
      items: items.map((m) => ({
        id: m.id,
        cuentaId: m.cuentaId,
        fecha: aIso(m.fecha),
        monto: montoDe(m.monto),
        glosa: m.glosa,
        referencia: m.referencia,
        estado: m.estado as z.infer<typeof estados>,
        origen: m.origen,
      })),
    };
  },
});

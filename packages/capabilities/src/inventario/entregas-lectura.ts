import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { entradaLista, paginaPor, PERMISOS_INVENTARIO, salidaLista } from "./comun";
import { dondeEntregaEnAlcance, entregaSchema, vistasEntrega } from "./entregas-comun";

export const entregasList = defineCapability({
  id: "inventario.entregas.list",
  descripcion:
    "Lista las entregas de inventario (activos y ropa) a personas e instalaciones, de la más reciente a la más antigua. Filtra por persona, instalación, activo o tipo de ropa, y por abiertas (lo que aún tienen) o devueltas.",
  permiso: PERMISOS_INVENTARIO.read,
  // Revela a qué personas se entregó: se audita qué personas se mostraron (sin datos).
  auditarLectura: (s) => s.items.flatMap((e) => (e.personaId ? [e.personaId] : [])),
  input: z.object({
    personaId: uuidSchema.optional(),
    instalacionId: uuidSchema.optional(),
    activoId: uuidSchema.optional(),
    tipoId: uuidSchema.optional(),
    estado: z.enum(["abiertas", "devueltas", "todas"]).default("abiertas"),
    ...entradaLista(50),
  }),
  output: salidaLista(entregaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.inventarioEntrega.findMany({
      where: {
        AND: [
          await dondeEntregaEnAlcance(ctx),
          input.personaId ? { personaId: input.personaId } : {},
          input.instalacionId ? { instalacionId: input.instalacionId } : {},
          input.activoId ? { activoId: input.activoId } : {},
          input.tipoId ? { tipoId: input.tipoId } : {},
          input.estado === "abiertas"
            ? { devueltaEn: null }
            : input.estado === "devueltas"
              ? { devueltaEn: { not: null } }
              : {},
          input.cursor ? { id: { lt: input.cursor } } : {},
        ],
      },
      orderBy: { id: "desc" },
      take: input.limite + 1,
    });
    const { items, siguiente } = paginaPor(filas, input.limite, (f) => f.id);
    return { items: await vistasEntrega(ctx, items), siguiente };
  },
});

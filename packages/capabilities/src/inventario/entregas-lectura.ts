import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondePersona, instalacionesEnAlcance } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import type { Contexto } from "../types";
import { PERMISOS_INVENTARIO } from "./comun";
import { entregaSchema, vistasEntrega } from "./entregas-comun";

/** Alcance (ADR-022): un supervisor ve solo entregas a sus instalaciones o a personas de ellas. */
async function dondeEnAlcance(ctx: Contexto) {
  const ids = instalacionesEnAlcance(ctx);
  if (!ids) return {};
  const personas = await ctx.db.persona.findMany({ where: { AND: [dondePersona(ctx)] }, select: { id: true } });
  return { OR: [{ instalacionId: { in: [...ids] } }, { personaId: { in: personas.map((p) => p.id) } }] };
}

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
    cursor: z.string().optional().describe("El `siguiente` de la página anterior."),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({ items: z.array(entregaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.inventarioEntrega.findMany({
      where: {
        AND: [
          await dondeEnAlcance(ctx),
          input.personaId ? { personaId: input.personaId } : {},
          input.instalacionId ? { instalacionId: input.instalacionId } : {},
          input.activoId ? { activoId: input.activoId } : {},
          input.tipoId ? { tipoId: input.tipoId } : {},
          input.estado === "abiertas" ? { devueltaEn: null } : input.estado === "devueltas" ? { devueltaEn: { not: null } } : {},
          input.cursor ? { id: { lt: input.cursor } } : {},
        ],
      },
      orderBy: { id: "desc" },
      take: input.limite + 1,
    });
    const pagina = filas.slice(0, input.limite);
    return {
      items: await vistasEntrega(ctx, pagina),
      siguiente: filas.length > input.limite ? (pagina.at(-1)?.id ?? null) : null,
    };
  },
});

import { z } from "zod";

import { SIN_PLATAFORMA } from "../agentes/plataforma";
import { defineCapability } from "../define";
import type { Contexto } from "../types";
import { vistaAprobaciones } from "./agentes/aprobaciones-vista";
import { fuentesDelActor, itemPorAprobarSchema, type ItemPorAprobar } from "./aprobaciones-fuentes";
import { filtroAprobacionesVisibles } from "./aprobaciones-reglas/comun";

/** Filtro de la cola del núcleo para el actor, o `null` si no ve ninguna (CAR-252). */
async function dondeNucleo(ctx: Contexto) {
  if (ctx.alcance) return null;
  const visibles = await filtroAprobacionesVisibles(ctx);
  if (visibles && !visibles.reglaId.in.length) return null;
  return {
    estado: "pendiente",
    venceEn: { gt: new Date() },
    ...SIN_PLATAFORMA,
    ...(visibles ?? {}),
  };
}

/**
 * Cuántas decisiones esperan al actor en «Por aprobar» (CAR-253): la cola del núcleo (agentes y reglas
 * de la empresa) más lo que aporta cada módulo con su propio criterio. `null` si no aprueba nada.
 */
export async function contarPorAprobar(ctx: Contexto): Promise<number | null> {
  const donde = await dondeNucleo(ctx);
  const fuentes = fuentesDelActor(ctx);
  if (!donde && !fuentes.length) return null;
  const [nucleo, ...modulos] = await Promise.all([
    donde ? ctx.db.aprobacion.count({ where: donde }) : 0,
    ...fuentes.map((f) => f.contar(ctx)),
  ]);
  return modulos.reduce((s, n) => s + n, nucleo);
}

const grupoSchema = z.object({
  origen: z.string(),
  titulo: z.string(),
  total: z.number().int(),
  items: z.array(itemPorAprobarSchema),
});

export const porAprobarList = defineCapability({
  // Lectura auditada (NÚCLEO-H): solo los ids de las decisiones reveladas.
  auditarLectura: (s) => s.grupos.flatMap((g) => g.items.map((i) => i.id)),
  id: "core.por_aprobar.list",
  descripcion:
    "Bandeja única «Por aprobar»: todo lo que espera la decisión del actor, venga de donde venga (acciones de agentes o de las reglas de la empresa, margen y envíos de cotizaciones, rendiciones, tickets con aprobación), agrupado por origen y con el enlace a la pantalla donde se resuelve. Cada módulo aplica su propio criterio de quién aprueba.",
  permiso: null,
  input: z.object({
    limite: z.number().int().min(1).max(50).default(10).describe("Máximo por grupo."),
  }),
  output: z.object({ total: z.number().int(), grupos: z.array(grupoSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { limite }) {
    const donde = await dondeNucleo(ctx);
    const grupos: z.input<typeof grupoSchema>[] = [];
    if (donde) {
      const [total, filas] = await Promise.all([
        ctx.db.aprobacion.count({ where: donde }),
        ctx.db.aprobacion.findMany({ where: donde, orderBy: { createdAt: "desc" }, take: limite }),
      ]);
      const items: ItemPorAprobar[] = (await vistaAprobaciones(ctx, filas)).map((a) => ({
        id: a.id,
        resumen: a.resumen,
        href: `/configuracion/aprobaciones?ver=${encodeURIComponent(a.id)}`,
        creadaEn: a.creadaEn,
      }));
      if (total)
        grupos.push({ origen: "nucleo", titulo: "Acciones de agentes y reglas", total, items });
    }
    for (const f of fuentesDelActor(ctx)) {
      const [total, items] = await Promise.all([f.contar(ctx), f.listar(ctx, limite)]);
      if (total)
        grupos.push({ origen: f.origen, titulo: f.titulo, total, items: items.slice(0, limite) });
    }
    return { total: grupos.reduce((s, g) => s + g.total, 0), grupos };
  },
});

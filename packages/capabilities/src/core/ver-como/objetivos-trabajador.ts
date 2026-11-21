import type { Contexto } from "../../types";
import { busca, type Item, type Tramo, visibles } from "./objetivos-comun";

/** Personas activas, con o sin usuario del portal trabajador (CAR-803). */
export async function trabajador(ctx: Contexto, { q, cursor, limite }: Tramo): Promise<Item[]> {
  const visiblesMembresia = await visibles(ctx, "trabajador");
  const usuariosVisibles = new Set(visiblesMembresia.map((m) => m.userId));
  const filas = await ctx.db.persona.findMany({
    where: {
      estado: "activo",
      archivadaEn: null,
      anonimizadaEn: null,
      OR: [{ nombres: busca(q) }, { apellidos: busca(q) }],
    },
    select: { id: true, nombres: true, apellidos: true, usuarioId: true },
    orderBy: { id: "asc" },
    take: limite + 50,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const items: Item[] = [];
  for (const p of filas) {
    if (p.usuarioId === ctx.usuario?.id) continue;
    if (p.usuarioId && !usuariosVisibles.has(p.usuarioId)) continue;
    items.push({ id: p.id, nombre: `${p.nombres} ${p.apellidos}`, detalle: null });
    if (items.length > limite) break;
  }
  return items.slice(0, limite + 1);
}
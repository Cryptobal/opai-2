import type { Contexto } from "../types";
import { cargoCerrado } from "./cierre-lectura";
import { MAX_PERSONAS as MAX } from "./resultados";
import { type Visibilidad, visiblesEntre } from "./visibilidad";

/**
 * Resultado de un cargo en un mes cerrado: las personas que ese mes tenían el cargo y su puntaje
 * guardado. Quién ve a quién se decide con la jefatura de hoy, igual que en un mes abierto.
 */
export async function deMesCerrado(
  ctx: Contexto,
  cargoId: string,
  periodo: string,
  vis: Visibilidad,
  despuesDe: string | undefined,
) {
  const guardados = await cargoCerrado(ctx, cargoId, periodo);
  const visibles = await visiblesEntre(
    ctx,
    vis,
    guardados.map((g) => g.personaId),
  );
  const propio = guardados.find((g) => g.personaId === vis.propia);
  if (propio && (vis.todos || propio.personaVeResultado)) visibles.add(propio.personaId);
  const orden = [...visibles].filter((id) => !despuesDe || id > despuesDe).sort();
  const pagina = orden.slice(0, MAX);
  const nombres = await ctx.db.persona.findMany({
    where: { id: { in: pagina } },
    select: { id: true, nombres: true, apellidos: true },
  });
  const porId = new Map(guardados.map((g) => [g.personaId, g]));
  return {
    cargoId,
    periodo,
    cerrado: true,
    vigenteDesde: guardados[0]?.vigenteDesde ?? null,
    personas: nombres
      .map((p) => ({
        personaId: p.id,
        nombres: p.nombres,
        apellidos: p.apellidos,
        puntaje: porId.get(p.id)?.puntaje ?? null,
        cobertura: porId.get(p.id)?.cobertura ?? 0,
      }))
      .sort((a, b) => (a.personaId < b.personaId ? -1 : 1)),
    siguiente: orden.length > MAX ? (pagina.at(-1) ?? null) : null,
  };
}

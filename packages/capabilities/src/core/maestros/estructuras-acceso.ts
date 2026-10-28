import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";
import type { FilaEstructura, FilaItem } from "./estructuras-vista";

/** Datos mínimos para resolver la sensibilidad y auditar la revelación de una estructura. */
type RefEstructura = Pick<FilaEstructura, "cargoId" | "puestoId" | "personaId"> & {
  id?: string;
  nivel?: string | null;
};

/**
 * Deja en la auditoría que el actor vio montos de sueldo sensibles gracias a
 * `core:estructuras.read_sensible` (quién, cuándo, qué). Lo exige la decisión t479u (Carlos delegó,
 * 26-oct-2026 22:06 CLT) por el art. 31 del DFL 2 de 1967: el Inspector DT fiscaliza con los montos
 * a la vista, pero toda lectura queda trazada. La vista previa de creación (sin fila persistida) no
 * se audita porque aún no hay nada leído.
 */
export async function auditarLecturaSensible(ctx: Contexto, e: RefEstructura): Promise<void> {
  if (!e.id) return;
  const entityId = e.id;
  await ctx.transaccion((tx) =>
    ctx.auditoria.registrar(tx, {
      tenantId: ctx.tenantId,
      // Pseudo-capacidad que marca la revelación de montos sensibles (no es un ejecutor del registro).
      capability: "core.estructuras.read_sensible",
      actor: ctx.actor,
      entityType: "estructura",
      entityId,
      payload: {
        nivel: e.nivel ?? null,
        cargoId: e.cargoId ?? null,
        puestoId: e.puestoId ?? null,
        personaId: e.personaId ?? null,
      },
    }),
  );
}

/** D7: montos solo con read_sensible; cada revelación queda auditada. */
export async function ocultarMontos(
  ctx: Contexto,
  e: RefEstructura,
  auditar = true,
): Promise<boolean> {
  // D7: el archivo conserva la misma restricción de montos que las capas activas.
  if (!ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)) return true;
  if (auditar) await auditarLecturaSensible(ctx, e);
  return false;
}

export async function itemsDe(ctx: Contexto, estructuraIds: string[]) {
  const items = await ctx.db.estructuraItem.findMany({
    where: { estructuraId: { in: estructuraIds } },
    orderBy: { orden: "asc" },
  });
  const por = new Map<string, FilaItem[]>();
  for (const i of items) por.set(i.estructuraId, [...(por.get(i.estructuraId) ?? []), i]);
  return por;
}

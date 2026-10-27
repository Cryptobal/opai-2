import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";
import type { FilaEstructura, FilaItem } from "./estructuras-vista";

/** Datos mínimos para resolver la sensibilidad y auditar la revelación de una estructura. */
type RefEstructura = Pick<FilaEstructura, "cargoId" | "puestoId" | "personaId"> & {
  id?: string;
  nivel?: string | null;
};

/**
 * ¿El cargo involucrado tiene sueldo sensible? El cargo sale de la estructura, de su puesto o del
 * vínculo vigente de la persona. Sin cargo determinable (persona sin vínculo vigente): true por
 * prudencia (se oculta, salvo que el actor tenga el permiso de sueldos sensibles).
 */
async function cargoSensible(ctx: Contexto, e: RefEstructura): Promise<boolean> {
  let cargoId = e.cargoId ?? null;
  if (!cargoId && e.puestoId) {
    cargoId = (await ctx.db.puesto.findUnique({ where: { id: e.puestoId } }))?.cargoId ?? null;
  }
  if (!cargoId && e.personaId) {
    const v = await ctx.db.vinculoLaboral.findFirst({
      where: { personaId: e.personaId, estado: "vigente" },
    });
    cargoId = v?.cargoId ?? null;
  }
  if (!cargoId) return true;
  return (await ctx.db.cargo.findUnique({ where: { id: cargoId } }))?.sueldoSensible ?? false;
}

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

/**
 * ¿Hay que ocultar montos? Sí si el cargo involucrado tiene sueldo sensible y el actor no tiene
 * `core:estructuras.read_sensible`. Si el actor SÍ lo tiene y el cargo es sensible, ve los montos y
 * la lectura queda en la auditoría (art. 31 del DFL 2 de 1967; decisión t479u).
 */
export async function ocultarMontos(
  ctx: Contexto,
  e: RefEstructura,
  auditar = true,
): Promise<boolean> {
  // D7 para las capas activas. Conserva el permiso explícito del Inspector DT de main (t479u).
  if (e.nivel !== "cargo") {
    if (!ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)) return true;
    if (auditar) await auditarLecturaSensible(ctx, e);
    return false;
  }
  if (!(await cargoSensible(ctx, e))) return false;
  if (!ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)) return true;
  await auditarLecturaSensible(ctx, e);
  return false;
}

/**
 * Variante de `ocultarMontos` para `core.cargos.list` (ADR-045): la consulta única ya trae el cargo
 * con su `sueldoSensible`, así que no hace falta `cargoSensible` (volvería a consultar el cargo por
 * fila, el N+1 que corrigió el #53). La auditoría de la revelación es la misma de siempre.
 */
export async function ocultarMontosDeCargo(
  ctx: Contexto,
  cargo: { id: string; sueldoSensible: boolean },
  estructura: { id: string } | undefined,
): Promise<boolean> {
  if (!cargo.sueldoSensible) return false;
  if (!ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)) return true;
  if (estructura) {
    await auditarLecturaSensible(ctx, {
      id: estructura.id,
      nivel: "cargo",
      cargoId: cargo.id,
      puestoId: null,
      personaId: null,
    });
  }
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

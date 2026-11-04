import type { AprobacionPlataforma } from "@opai/db";
import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { auditarEnPlataforma, esDePlataforma, hechoPlataforma } from "../../agentes/plataforma";
import { tienePermisoDeCapacidad } from "../../autorizacion";
import { noEncontrado, prohibido } from "../../errores";
import { obtenerCapacidad } from "../../registry";
import type { Contexto } from "../../types";
import { iso } from "../comun";

// Aprobaciones de acciones `platform.*` (CAR-36): viven en `core.aprobaciones_plataforma`, fuera de
// los tenants. Las ve quien tiene acceso de plataforma (owner o support); las resuelve quien además
// tiene el permiso de la acción pedida. Un owner o admin de empresa sin `platformRole` no las ve.

/** Ve la cola de plataforma: acceso de plataforma y permiso de lectura de plataforma. */
export const veAprobacionesPlataforma = (ctx: Contexto) =>
  Boolean(ctx.plataforma) && ctx.autorizar(PERMISOS_PLATAFORMA.tenantsRead);

/**
 * Una aprobación de `platform.*` solo existe para quien puede verla: si no, NOT_FOUND (no revela
 * que existe). Para resolverla además hay que poder ejecutar la acción: así una persona sin ese
 * permiso no la marca «aprobada» para luego fallar al ejecutarla (no la quema).
 */
export function exigirVisiblePlataforma(ctx: Contexto, capability: string, resolver = false) {
  if (!esDePlataforma(capability)) return;
  if (!veAprobacionesPlataforma(ctx)) throw noEncontrado("La aprobación");
  const capacidad = obtenerCapacidad(capability);
  if (resolver && capacidad?.permiso && !tienePermisoDeCapacidad(ctx, capacidad))
    throw prohibido("No tienes el permiso de plataforma que exige esta acción.");
}

/** Misma forma que las aprobaciones de empresa, con `ambito: "plataforma"`. */
export async function vistaAprobacionesPlataforma(ctx: Contexto, filas: AprobacionPlataforma[]) {
  const p = ctx.plataforma;
  if (!p || !filas.length) return [];
  const usuarios = await p.globales.nombresDeUsuarios([...new Set(filas.map((f) => f.viaUserId))]);
  const via = new Map(usuarios.map((u) => [u.id, u.name]));
  return filas.map((a) => ({
    id: a.id,
    ambito: "plataforma" as const,
    apiKeyId: a.apiKeyId,
    agente: a.agente,
    via: via.get(a.viaUserId) ?? null,
    riesgo:
      obtenerCapacidad(a.capability)?.efecto === "irreversible"
        ? ("alto" as const)
        : ("medio" as const),
    capability: a.capability,
    resumen: a.resumen,
    input: a.input,
    estado: a.estado as "pendiente",
    venceEn: a.venceEn.toISOString(),
    resueltaPor: a.resueltaPor ?? null,
    resueltaEn: iso(a.resueltaEn),
    motivo: a.motivo ?? null,
    resultado: a.resultado ?? null,
    creadaEn: a.createdAt.toISOString(),
  }));
}

/**
 * Una aprobación de la cola de plataforma visible para el actor: la propia (la pidió su key de
 * plataforma) o cualquiera si ve la cola. `null` si no existe o no puede verla.
 */
export async function aprobacionPlataformaVisible(ctx: Contexto, id: string) {
  if (!ctx.plataforma) return null;
  const a = await ctx.plataforma.globales.aprobacionPlataformaPorId(id);
  if (!a) return null;
  const propia = Boolean(ctx.agente?.apiKeyId) && a.apiKeyId === ctx.agente?.apiKeyId;
  return propia || veAprobacionesPlataforma(ctx) ? a : null;
}

/**
 * Lectura de aprobaciones de plataforma desde `core.aprobaciones.*`: sus ids van a la auditoría
 * global (CAR-40), en la transacción de la lectura (`ctx.db`), nunca a la cadena de la empresa.
 */
export async function auditarLecturaPlataforma(
  ctx: Contexto,
  capability: string,
  filas: readonly { id: string }[],
) {
  const hecho = hechoPlataforma(ctx, { capability, payload: { ids: filas.map((f) => f.id) } });
  await auditarEnPlataforma(ctx, hecho, ctx.db);
}

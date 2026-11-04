import type { AprobacionPlataforma } from "@opai/db";

import { tienePermisoDeCapacidad } from "../../autorizacion";
import { conflicto, noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import { obtenerCapacidad } from "../../registry";
import type { Contexto } from "../../types";
import { aprobacionPlataformaVisible, exigirVisiblePlataforma } from "./aprobaciones-plataforma";

type FilaEmpresa = Awaited<ReturnType<Contexto["db"]["aprobacion"]["findFirstOrThrow"]>>;

export type Pendiente =
  { ambito: "empresa"; a: FilaEmpresa } | { ambito: "plataforma"; a: AprobacionPlataforma };

/**
 * La aprobación pendiente que una persona va a resolver: de la empresa actual
 * (`core.aprobaciones.*`) o de la cola de plataforma (`platform.aprobaciones.*`, CAR-36). Una `platform.*` no existe para quien no tiene
 * `platformRole`, y la resuelve (aprueba o rechaza) solo quien puede ejecutar la acción pedida.
 */
export async function pendiente<A extends Pendiente["ambito"]>(
  ctx: Contexto,
  id: string,
  aprobar: boolean,
  ambito: A,
): Promise<Extract<Pendiente, { ambito: A }>> {
  let p: Pendiente | null;
  if (ambito === "empresa") {
    const empresa = await ctx.db.aprobacion.findUnique({ where: { id } });
    // Filas `platform.*` que quedaron en la empresa antes de CAR-36: solo con platformRole.
    if (empresa) exigirVisiblePlataforma(ctx, empresa.capability, true);
    p = empresa ? { ambito: "empresa", a: empresa } : null;
  } else {
    const a = await aprobacionPlataformaVisible(ctx, id);
    p = a ? { ambito: "plataforma", a } : null;
  }
  if (!p) throw noEncontrado("La aprobación");
  if (p.ambito === "plataforma") exigirVisiblePlataforma(ctx, p.a.capability, true);
  // Aprobar ejecuta la acción con los permisos de quien aprueba: sin ese permiso se rechaza aquí,
  // antes de marcarla «aprobada» (si no, quedaría quemada con una ejecución fallida).
  // `tienePermisoDeCapacidad` respeta `permisosAlternos` (paridad con `executeCapability`): quien solo
  // tiene un permiso alterno (p. ej. `subir_alcance`) ejecuta la acción acotada, igual que directo.
  // No gana nada: resolver exige además el permiso de `core.aprobaciones.*`.
  const capacidad = obtenerCapacidad(p.a.capability);
  if (aprobar && capacidad?.permiso && !tienePermisoDeCapacidad(ctx, capacidad))
    throw prohibido("No tienes el permiso que exige la acción pedida; no se puede aprobar.");
  if (p.a.estado !== "pendiente") throw conflicto(`La aprobación ya está ${p.a.estado}.`);
  if (p.a.venceEn.getTime() <= Date.now())
    throw reglaDeNegocio("La aprobación venció; el agente debe pedirla de nuevo.");
  if (ctx.actor.tipo !== "user")
    throw prohibido("Solo una persona puede resolver una aprobación (no una API key).");
  return p as Extract<Pendiente, { ambito: A }>;
}

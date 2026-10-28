import { z } from "zod";

import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { dondePersona } from "../maestros/alcance";

const error = () =>
  reglaDeNegocio("Las referencias del anexo no corresponden al vínculo vigente.");

function estructuraIdsDe(snapshots: unknown[]): string[] {
  const ids = new Set<string>();
  for (const valor of snapshots) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) continue;
    const id = (valor as Record<string, unknown>)["estructuraId"];
    if (typeof id === "string" && z.uuid().safeParse(id).success) ids.add(id);
  }
  return [...ids];
}

/**
 * Bloquea, dentro de la transacción de aprobación, las filas que la validación va a leer (vínculos
 * de la persona y las estructuras de sueldo referenciadas): ningún cambio concurrente se cuela entre
 * la validación y la lectura que materializa el documento final (ventana de concurrencia detectada
 * en la autorrevisión del PR #91).
 */
async function bloquearReferencias(ctx: Contexto, personaId: string, estructuraIds: string[]) {
  await ctx.transaccion(
    (tx) => tx.$queryRaw`
    /* 07b:bloqueo-vinculos-anexo */
    SELECT id FROM core.vinculos_laborales
    WHERE tenant_id = ${ctx.tenantId}::uuid AND persona_id = ${personaId}::uuid
    FOR SHARE
  `,
  );
  if (estructuraIds.length) {
    await ctx.transaccion(
      (tx) => tx.$queryRaw`
      /* 07b:bloqueo-estructuras-anexo */
      SELECT id FROM core.estructuras_sueldo
      WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ANY(${estructuraIds}::uuid[])
      FOR SHARE
    `,
    );
  }
}

/**
 * Valida todas las referencias del anexo (también las que no usa el motivo actual), siempre del
 * mismo tenant y de la persona del anexo, nunca de otra. `instalacionId`/`puestoId` se aceptan si
 * pertenecieron a cualquier vínculo —vigente o anterior— de esa misma persona: un anexo puede
 * documentar el cambio desde un vínculo previo (decisión OPAI 2.0, delegada por Carlos t500u). Con
 * `opciones.bloquear` (solo al aprobar, dentro de su transacción) bloquea antes de leer para cerrar
 * la ventana de concurrencia.
 */
export async function validarSnapshots(
  ctx: Contexto,
  personaId: string,
  snapshots: unknown[],
  vinculoId?: string,
  opciones?: { bloquear?: boolean },
) {
  if (opciones?.bloquear) {
    await bloquearReferencias(ctx, personaId, estructuraIdsDe(snapshots));
  }
  const vinculos = await ctx.db.vinculoLaboral.findMany({
    where: { tenantId: ctx.tenantId, personaId, persona: dondePersona(ctx) },
  });
  const ancla = vinculoId
    ? vinculos.find((v) => v.id === vinculoId)
    : vinculos.find((v) => v.estado === "vigente");
  if (!ancla) throw error();
  const instalacionIds = new Set(
    vinculos.flatMap((v) => (v.instalacionId ? [v.instalacionId] : [])),
  );
  const puestoIds = new Set(vinculos.flatMap((v) => (v.puestoId ? [v.puestoId] : [])));
  const cargoIds = [...new Set(vinculos.map((v) => v.cargoId))];
  const perteneceA = (id: unknown, ids: Set<string>) => {
    if (id != null && (typeof id !== "string" || !ids.has(id))) throw error();
  };
  for (const valor of snapshots) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) continue;
    const snapshot = valor as Record<string, unknown>;
    perteneceA(snapshot["instalacionId"], instalacionIds);
    perteneceA(snapshot["puestoId"], puestoIds);
    const id = snapshot["estructuraId"];
    if (id != null) {
      if (!z.uuid().safeParse(id).success) throw error();
      const estructura = await ctx.db.estructuraSueldo.findFirst({
        where: {
          id: id as string,
          tenantId: ctx.tenantId,
          OR: [
            { nivel: "persona", personaId },
            ...(puestoIds.size
              ? [{ nivel: "puesto" as const, puestoId: { in: [...puestoIds] } }]
              : []),
            ...(instalacionIds.size
              ? [{ nivel: "instalacion" as const, instalacionId: { in: [...instalacionIds] } }]
              : []),
            { nivel: "cargo" as const, cargoId: { in: cargoIds } },
          ],
        },
      });
      if (!estructura) throw error();
    }
  }
  return ancla;
}

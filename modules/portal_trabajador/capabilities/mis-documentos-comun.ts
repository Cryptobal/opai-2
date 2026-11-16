import type { Contexto } from "@opai/capabilities";

export const PORTAL = "trabajador";

/**
 * Filtro de los documentos que el trabajador puede ver (CAR-463): disponibles (no archivados ni pendientes de subida),
 * con su propia persona como propietaria y visibles en el portal del trabajador. Visible = el documento lo dice en
 * `visibleEn` o, si el documento no fija portales, su tipo lo trae por defecto (contratos y anexos generados nacen
 * sin `visibleEn` y heredan del tipo). Lo demás nunca se muestra (fail-closed).
 */
export function dondeMisDocumentos(personaId: string) {
  return {
    estado: "disponible",
    archivadoEn: null,
    vinculos: { some: { entidadTipo: "persona", entidadId: personaId, rol: "propietario" } },
    OR: [
      { visibleEn: { has: PORTAL } },
      { visibleEn: { isEmpty: true }, tipo: { is: { visiblePortalDefault: { has: PORTAL } } } },
    ],
  };
}

/** Consumo de una URL de descarga emitida (se mide siempre, aunque ya se haya entregado). */
export async function medirDescarga(ctx: Contexto, documentoId: string): Promise<void> {
  await ctx.medidor
    .registrar({
      tenantId: ctx.tenantId,
      modulo: "portal_trabajador",
      actorTipo: ctx.actor.tipo,
      actorId: ctx.actor.id ?? null,
      viaUserId: ctx.actor.viaUserId ?? null,
      apiKeyId: ctx.actor.tipo === "agent" && !ctx.actor.interno ? ctx.actor.id : null,
      portal: ctx.portal,
      recurso: "almacenamiento.descarga",
      unidad: "url",
      cantidad: 1,
      referenciaTipo: "documento",
      referenciaId: documentoId,
      yaIncurrido: true,
    })
    .catch(() => undefined);
}

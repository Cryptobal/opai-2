import type { Contexto } from "../../types";

const TICKETS_VER_TODOS = "tickets:tickets.ver_todos";

/** Documentos cuyo dueño es una visita en instalaciones del actor. */
export async function documentoIdsVisitaEnInstalaciones(
  ctx: Contexto,
  instalacionIds: readonly string[],
) {
  if (!instalacionIds.length) return [];
  return ctx.transaccion(
    (tx) => tx.$queryRaw<{ documentoId: string }[]>`
    /* nucleo-h:propietarios-visita */
    SELECT dv.documento_id AS "documentoId" FROM core.documento_vinculos dv
    JOIN pauta.visitas v ON v.id = dv.entidad_id AND v.tenant_id = dv.tenant_id
    WHERE dv.tenant_id = ${ctx.tenantId}::uuid AND dv.rol = 'propietario' AND dv.entidad_tipo = 'visita'
      AND v.instalacion_id = ANY(${[...instalacionIds]}::uuid[])
    ORDER BY dv.id FOR SHARE OF dv, v
  `,
  );
}

/** Documentos cuyo dueño es un ticket visible para el usuario o con ver_todos. */
export async function documentoIdsTicket(ctx: Contexto) {
  const uid = ctx.usuario?.id;
  const verTodos = ctx.autorizar(TICKETS_VER_TODOS);
  if (!uid && !verTodos) return [];
  return ctx.transaccion((tx) => {
    if (verTodos) {
      return tx.$queryRaw<{ documentoId: string }[]>`
    /* nucleo-h:propietarios-ticket-todos */
    SELECT dv.documento_id AS "documentoId" FROM core.documento_vinculos dv
    WHERE dv.tenant_id = ${ctx.tenantId}::uuid AND dv.rol = 'propietario' AND dv.entidad_tipo = 'ticket'
    ORDER BY dv.id FOR SHARE`;
    }
    return tx.$queryRaw<{ documentoId: string }[]>`
    /* nucleo-h:propietarios-ticket */
    SELECT dv.documento_id AS "documentoId" FROM core.documento_vinculos dv
    JOIN tickets.tickets t ON t.id = dv.entidad_id AND t.tenant_id = dv.tenant_id
    WHERE dv.tenant_id = ${ctx.tenantId}::uuid AND dv.rol = 'propietario' AND dv.entidad_tipo = 'ticket'
      AND (t.solicitante_id = ${uid!}::uuid OR t.responsable_id = ${uid!}::uuid)
    ORDER BY dv.id FOR SHARE OF dv, t`;
  });
}

/** Instalación asociada cuando el dueño del documento es visita o ticket. */
export async function instalacionDeVisitaOTicket(
  ctx: Contexto,
  entidadTipo: string,
  entidadId: string,
): Promise<string[]> {
  if (entidadTipo === "visita") {
    const v = await ctx.db.visitaSupervision.findUnique({
      where: { id: entidadId },
      select: { instalacionId: true },
    });
    return v ? [v.instalacionId] : [];
  }
  if (entidadTipo === "ticket") {
    const t = await ctx.db.ticket.findUnique({
      where: { id: entidadId },
      select: { instalacionId: true },
    });
    return t?.instalacionId ? [t.instalacionId] : [];
  }
  return [];
}
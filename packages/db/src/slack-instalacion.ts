import { clienteApp } from "./client";

/**
 * Resuelve la empresa de un evento de Slack ya firmado (ADR-093 §10, CAR-291) por el `team_id` de la
 * instalación. Corre antes de existir tenant, así que usa la función `SECURITY DEFINER`
 * `core.slack_instalacion_resolver`: solo recibe un team_id exacto y devuelve el id del tenant; no deja
 * listar ni leer nada más. Sin coincidencia (o con un formato raro), null.
 */
export async function resolverInstalacionSlack(
  teamId: string,
): Promise<{ tenantId: string } | null> {
  if (!/^T[A-Z0-9]{4,}$/.test(teamId)) return null;
  const filas = await clienteApp().$queryRaw<{ tenant_id: string | null }[]>`
    SELECT "core"."slack_instalacion_resolver"(${teamId}) AS tenant_id`;
  const t = filas[0]?.tenant_id;
  return t ? { tenantId: t } : null;
}

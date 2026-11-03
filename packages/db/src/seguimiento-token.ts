import { clienteApp } from "./client";

/**
 * Resuelve el tenant y el seguimiento de un token de respuesta (receptor del correo entrante, CAR-67).
 * Corre antes de existir tenant, así que usa la función `SECURITY DEFINER`
 * `comercial.seguimiento_resolver_token`: solo recibe el token exacto y devuelve ids; no deja
 * listar ni leer nada más. Sin coincidencia, null.
 */
export async function resolverTokenSeguimiento(
  token: string,
): Promise<{ tenantId: string; seguimientoId: string } | null> {
  const filas = await clienteApp().$queryRaw<{ tenant_id: string; seguimiento_id: string }[]>`
    SELECT tenant_id, seguimiento_id FROM "comercial"."seguimiento_resolver_token"(${token})`;
  const f = filas[0];
  return f ? { tenantId: f.tenant_id, seguimientoId: f.seguimiento_id } : null;
}

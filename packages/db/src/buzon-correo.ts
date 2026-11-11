import { clienteApp } from "./client";

/**
 * Resuelve el tenant de la dirección estable de una empresa (`t<token>@respuestas.opai.cl`, CAR-233) en
 * el receptor del correo entrante. Corre antes de existir tenant, así que usa la función
 * `SECURITY DEFINER` `core.buzon_correo_resolver`: solo recibe el token exacto y devuelve el id del
 * tenant; no deja listar ni leer nada más. Sin coincidencia, null.
 */
export async function resolverBuzonCorreo(token: string): Promise<{ tenantId: string } | null> {
  const filas = await clienteApp().$queryRaw<{ tenant_id: string | null }[]>`
    SELECT "core"."buzon_correo_resolver"(${token}) AS tenant_id`;
  const t = filas[0]?.tenant_id;
  return t ? { tenantId: t } : null;
}

import type { Contexto } from "@opai/capabilities";

/**
 * Capacidades que `/api/v1` ejecuta con SESIÓN en el portal ERP fijado en servidor (CAR-37, puente
 * de CAR-52). Fuera de esta lista, una sesión en `/api/v1` sigue con portal nulo y `restriccion` la
 * rechaza para las capacidades del tenant (encargo portal-sesión): el portal nunca sale del cliente.
 * Son las de roles y permisos de Configuración → Usuarios; varias son `soloPersonas`, así que por API
 * key y MCP siguen bloqueadas (ADR-034). Lo verifica `packages/capabilities/test/paridad-camino-humano`.
 */
export const CAPACIDADES_V1_SESION_ERP: readonly string[] = [
  "core.permisos.catalogo",
  "core.roles.list",
  "core.roles.create",
  "core.roles.update",
  "core.roles.archive",
  "core.roles.assign",
  "core.excepciones.list",
  "core.excepciones.set",
  "core.users.list",
  "core.users.update",
];

const prohibido = () =>
  Response.json(
    { ok: false, error: { code: "FORBIDDEN", message: "Origen no permitido." } },
    { status: 403 },
  );

/**
 * Fija el portal ERP para una sesión humana en `/api/v1` solo si la capacidad está en la lista y la
 * membresía actual tiene el ERP; el MFA ya lo exigió `resolverActor`. Una escritura con cookie desde
 * otro sitio se corta (CSRF): `Origin` distinto o `Sec-Fetch-Site: cross-site`. API keys y sistema no
 * cambian: su autorización no depende del portal de sesión.
 */
export function contextoV1Sesion(ctx: Contexto, id: string, req: Request): Contexto | Response {
  if (ctx.actor.tipo !== "user" || ctx.portal !== null || !ctx.conTenant) return ctx;
  if (!CAPACIDADES_V1_SESION_ERP.includes(id)) return ctx;
  if (req.method !== "GET") {
    const origen = req.headers.get("origin");
    if (origen !== null && origen !== new URL(req.url).origin) return prohibido();
    if (req.headers.get("sec-fetch-site") === "cross-site") return prohibido();
  }
  if (!ctx.portalesMembresia.includes("erp")) return ctx;
  return { ...ctx, portal: "erp" };
}

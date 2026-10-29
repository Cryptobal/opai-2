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

const LECTURA = new Set(["GET", "HEAD"]);

const prohibido = () =>
  Response.json(
    { ok: false, error: { code: "FORBIDDEN", message: "Origen no permitido." } },
    { status: 403 },
  );

/**
 * Mismo sitio de verdad: `Origin` igual al de la API o `Sec-Fetch-Site` same-origin/none. Sin ninguna
 * de las dos señales se rechaza (fail-closed): una llamada con cookie desde otro sitio (CSRF, o una
 * navegación GET que ensuciaría la auditoría de lecturas) nunca llega a la capacidad.
 */
function mismoOrigen(req: Request): boolean {
  const origen = req.headers.get("origin");
  if (origen !== null) return origen === new URL(req.url).origin;
  const sitio = req.headers.get("sec-fetch-site");
  return sitio === "same-origin" || sitio === "none";
}

/**
 * Fija el portal ERP para una sesión humana en `/api/v1` solo si la capacidad está en la lista, la
 * petición viene del mismo origen y la membresía actual tiene el ERP; el MFA ya lo exigió
 * `resolverActor`. API keys y sistema no cambian: su autorización no depende del portal de sesión.
 */
export function contextoV1Sesion(ctx: Contexto, id: string, req: Request): Contexto | Response {
  if (ctx.actor.tipo !== "user" || ctx.portal !== null || !ctx.conTenant) return ctx;
  if (!CAPACIDADES_V1_SESION_ERP.includes(id)) return ctx;
  if (!mismoOrigen(req)) return prohibido();
  if (!ctx.portalesMembresia.includes("erp")) return ctx;
  return { ...ctx, portal: "erp" };
}

/**
 * Toda escritura con sesión, esté o no en la lista, exige `Origin` igual al de la API (CAR-38): la
 * cookie viaja sola y sin esto una página ajena podría escribir a nombre del usuario. No fija portal
 * ni relaja nada: las lecturas siguen el criterio de `contextoV1Sesion`. API keys y sistema no cambian.
 */
export function exigirOrigenEnEscritura(ctx: Contexto, req: Request): Response | null {
  if (ctx.actor.tipo !== "user" || ctx.portal !== null || LECTURA.has(req.method)) return null;
  return req.headers.get("origin") === new URL(req.url).origin ? null : prohibido();
}

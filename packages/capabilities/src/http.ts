import { executeCapability } from "./execute";
import { obtenerCapacidad } from "./registry";
import type { CodigoError, Contexto, Resultado } from "./types";

/** Devuelve el contexto del actor o una Response (401, 503) que corta la petición. */
export type FabricaContexto = (req: Request) => Promise<Contexto | Response>;

const ESTADO: Record<CodigoError, number> = {
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  DRY_RUN_NOT_SUPPORTED: 400,
  APPROVAL_REQUIRED: 202,
  BUDGET_EXCEEDED: 402,
  INVALID_OUTPUT: 500,
  INTERNAL: 500,
};

function json(cuerpo: unknown, status = 200): Response {
  return Response.json(cuerpo, { status });
}

function respuesta(resultado: Resultado): Response {
  return json(resultado, resultado.ok ? 200 : ESTADO[resultado.error.code]);
}

function error(code: CodigoError, message: string): Response {
  return respuesta({ ok: false, error: { code, message } });
}

type Cuerpo = { input?: unknown; dry_run?: boolean; idempotency_key?: string };

async function leerCuerpo(req: Request): Promise<Cuerpo | Response> {
  try {
    const cuerpo: unknown = await req.json();
    return cuerpo && typeof cuerpo === "object" ? (cuerpo as Cuerpo) : {};
  } catch {
    return error("INVALID_INPUT", "El cuerpo debe ser JSON.");
  }
}

function leerInputDeQuery(req: Request): unknown | Response {
  const crudo = new URL(req.url).searchParams.get("input");
  if (!crudo) return {};
  try {
    return JSON.parse(crudo) as unknown;
  } catch {
    return error("INVALID_INPUT", "El parámetro `input` debe ser JSON.");
  }
}

/**
 * Handler HTTP de `/api/v1/<modulo>/<entidad>/<verbo>` (o `/api/v1/<modulo>.<entidad>.<verbo>`).
 * GET solo para capacidades de lectura (input en `?input=<json>`); POST para todas
 * (`{ "input": {...}, "dry_run": false, "idempotency_key": "..." }`).
 */
export async function manejarCapacidadHttp(
  req: Request,
  segmentos: readonly string[],
  fabrica: FabricaContexto,
): Promise<Response> {
  const id = segmentos.join(".");
  const capacidad = obtenerCapacidad(id);
  // Las internas (flujo de invitación) solo las usa la UI del núcleo.
  if (!capacidad || capacidad.interna) return error("NOT_FOUND", `Capacidad "${id}" no existe.`);

  let input: unknown;
  let dryRun = false;
  let idempotencyKey: string | undefined;

  if (req.method === "GET") {
    if (capacidad.efecto !== "lectura")
      return json({ ok: false, error: { code: "METHOD", message: "Usa POST." } }, 405);
    const leido = leerInputDeQuery(req);
    if (leido instanceof Response) return leido;
    input = leido;
  } else if (req.method === "POST") {
    const cuerpo = await leerCuerpo(req);
    if (cuerpo instanceof Response) return cuerpo;
    input = cuerpo.input ?? {};
    dryRun = cuerpo.dry_run === true;
    idempotencyKey =
      typeof cuerpo.idempotency_key === "string" ? cuerpo.idempotency_key : undefined;
  } else {
    return json({ ok: false, error: { code: "METHOD", message: "Método no permitido." } }, 405);
  }

  const ctx = await fabrica(req);
  if (ctx instanceof Response) return ctx;

  const opciones = idempotencyKey ? { dryRun, idempotencyKey } : { dryRun };
  return respuesta(await executeCapability(ctx, id, input, opciones));
}

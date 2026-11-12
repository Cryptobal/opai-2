import { motivoDeError } from "@/lib/slack-eventos";
import { permitir } from "@/lib/rate-limit";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

const PANTALLA = "/configuracion/integraciones/slack";

/** Vuelve a la pantalla de Slack con un resultado corto; nunca con el código ni el state. */
function volver(req: Request, resultado: Record<string, string>): Response {
  const url = new URL(PANTALLA, req.url);
  for (const [k, v] of Object.entries(resultado)) url.searchParams.set(k, v);
  return new Response(null, {
    status: 303,
    headers: {
      Location: url.toString(),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

/**
 * Vuelta del OAuth de Slack (CAR-291, ADR-093 §10). Exige sesión: ejecuta `core.slack.conectar` como
 * la persona que vuelve, que verifica que el `state` sea de esa persona y de su empresa activa.
 * Nunca toma la empresa de la URL. Quien cancela en Slack vuelve con «cancelado».
 */
export async function GET(req: Request): Promise<Response> {
  const identidad = await identidadActual();
  if (!identidad?.actual) return volver(req, { slack: "error", motivo: "sesion" });
  if (!(await permitir(`slack-oauth:${identidad.usuario.id}`, 20, 600_000))) {
    return volver(req, { slack: "error", motivo: "limite" });
  }
  const q = new URL(req.url).searchParams;
  if (q.get("error")) return volver(req, { slack: "error", motivo: "cancelado" });
  const code = q.get("code") ?? "";
  const estado = q.get("state") ?? "";
  if (!code || !estado || code.length > 500 || estado.length > 512) {
    return volver(req, { slack: "error", motivo: "enlace" });
  }
  const r = await ejecutarComoUsuario("erp", "core.slack.conectar", { code, estado });
  return r.ok
    ? volver(req, { slack: "conectado" })
    : volver(req, { slack: "error", motivo: motivoDeError(r.error) });
}

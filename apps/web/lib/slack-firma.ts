import { appSlackDelEntorno, verificarFirmaSlack } from "@opai/integrations";

import { ipDe, permitir } from "@/lib/rate-limit";
import { MAX_CUERPO_SLACK } from "@/lib/slack-eventos";

export const listo = () => new Response(null, { status: 200 });
export const demasiadas = () =>
  new Response(null, { status: 429, headers: { "Retry-After": "60" } });

/**
 * Cuerpo de una llamada de Slack con firma y marca de tiempo verificadas, o la respuesta de rechazo.
 * Cupo por IP antes de la firma (un flujo sin firmar no agota el de Slack); sin la app en el entorno
 * o sin firma válida responde 401 (falla cerrado).
 */
export async function cuerpoFirmadoSlack(req: Request, cupoIp: string): Promise<string | Response> {
  if (!(await permitir(`${cupoIp}:${ipDe(req)}`, 300, 60_000))) return demasiadas();
  const app = appSlackDelEntorno();
  if (!app) return new Response(null, { status: 401 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_CUERPO_SLACK)
    return new Response(null, { status: 413 });
  const cuerpo = await req.text();
  if (cuerpo.length > MAX_CUERPO_SLACK) return new Response(null, { status: 413 });
  const firmada = verificarFirmaSlack(app.signingSecret, cuerpo, {
    timestamp: req.headers.get("x-slack-request-timestamp"),
    firma: req.headers.get("x-slack-signature"),
  });
  return firmada ? cuerpo : new Response(null, { status: 401 });
}

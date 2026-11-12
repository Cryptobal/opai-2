import { crearContexto, executeCapability } from "@opai/capabilities";
import { resolverInstalacionSlack } from "@opai/db";
import { appSlackDelEntorno, verificarFirmaSlack } from "@opai/integrations";

import { medidorDiferido } from "@/lib/medidor";
import { ipDe, permitir } from "@/lib/rate-limit";
import { asegurarRegistro } from "@/lib/registro";
import { leerEventoSlack, MAX_CUERPO_SLACK } from "@/lib/slack-eventos";

asegurarRegistro();

const listo = () => new Response(null, { status: 200 });
const demasiadas = () => new Response(null, { status: 429, headers: { "Retry-After": "60" } });

/**
 * Events API de la app de Slack «OPAI» (CAR-291, ADR-093 §10). Sin la app en el entorno o sin firma
 * válida responde 401 (falla cerrado). Verifica la URL (`url_verification`) y registra la
 * desinstalación o la revocación del token del bot: resuelve la empresa por el team_id con una función
 * SECURITY DEFINER y ejecuta `core.slack.desinstalada` (interna). Lo demás se ignora sin guardar nada.
 */
export async function POST(req: Request): Promise<Response> {
  // Por IP antes de la firma (un flujo sin firmar no agota el cupo de Slack) y global después.
  if (!(await permitir(`slack-eventos-ip:${ipDe(req)}`, 300, 60_000))) return demasiadas();
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
  if (!firmada) return new Response(null, { status: 401 });
  if (!(await permitir("slack-eventos", 1200, 60_000))) return demasiadas();

  const ev = leerEventoSlack(cuerpo);
  if (ev.tipo === "verificacion") return Response.json({ challenge: ev.challenge });
  if (ev.tipo !== "desinstalada") return listo();
  const dueno = await resolverInstalacionSlack(ev.teamId);
  if (!dueno) return listo();
  const ctx = crearContexto({
    tenantId: dueno.tenantId,
    actor: { tipo: "system" },
    medidor: medidorDiferido,
  });
  const r = await executeCapability(ctx, "core.slack.desinstalada", {
    teamId: ev.teamId,
    ...(ev.botUserIds ? { botUserIds: ev.botUserIds } : {}),
    ...(ev.ocurridoEn ? { ocurridoEn: ev.ocurridoEn } : {}),
  });
  // Un fallo transitorio pide a Slack que reintente; borrar dos veces no hace daño.
  return r.ok ? listo() : new Response(null, { status: 500 });
}

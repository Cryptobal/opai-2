import { crearContexto, executeCapability } from "@opai/capabilities";
import { resolverInstalacionSlack } from "@opai/db";

import { medidorDiferido } from "@/lib/medidor";
import { permitir } from "@/lib/rate-limit";
import { asegurarRegistro } from "@/lib/registro";
import { leerEventoSlack } from "@/lib/slack-eventos";
import { cuerpoFirmadoSlack, demasiadas, listo } from "@/lib/slack-firma";

asegurarRegistro();

/**
 * Events API de la app de Slack «OPAI» (CAR-291, ADR-093 §10). Sin la app en el entorno o sin firma
 * válida responde 401 (falla cerrado). Verifica la URL (`url_verification`) y registra la
 * desinstalación o la revocación del token del bot: resuelve la empresa por el team_id con una función
 * SECURITY DEFINER y ejecuta `core.slack.desinstalada` (interna). Lo demás se ignora sin guardar nada.
 */
export async function POST(req: Request): Promise<Response> {
  // Por IP antes de la firma y global después.
  const cuerpo = await cuerpoFirmadoSlack(req, "slack-eventos-ip");
  if (cuerpo instanceof Response) return cuerpo;
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

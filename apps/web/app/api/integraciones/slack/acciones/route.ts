import { crearContexto, executeCapability } from "@opai/capabilities";
import { resolverInstalacionSlack } from "@opai/db";

import { medidorDiferido } from "@/lib/medidor";
import { asegurarRegistro } from "@/lib/registro";
import { contextoDeVinculado } from "@/lib/slack-acciones";
import { ACCIONES_SLACK, leerClicSlack } from "@/lib/slack-clic";
import { cuerpoFirmadoSlack, listo } from "@/lib/slack-firma";

asegurarRegistro();

const SIN_VINCULO =
  "Tu usuario de Slack no está vinculado a OPAI, así que no se hizo nada. Pide a un administrador que revise Configuración › Integraciones › Slack.";
const RESPONDER =
  "Para responder, escribe en el hilo de este aviso. Lo que respondas queda en OPAI.";

/**
 * Interactividad de la app de Slack «OPAI» (CAR-294, ADR-093 §10). Verifica la firma y la marca de
 * tiempo antes de leer nada; la empresa sale del team_id y el actor del vínculo de F2, nunca del canal.
 * Cada botón ejecuta su capacidad como la persona vinculada, con sus permisos y su alcance, y con una
 * clave de idempotencia por clic: un reintento de Slack no repite nada. A quien no está vinculado o
 * no tiene permiso le llega un aviso efímero y no se ejecuta nada.
 */
export async function POST(req: Request): Promise<Response> {
  const cuerpo = await cuerpoFirmadoSlack(req, "slack-acciones-ip");
  if (cuerpo instanceof Response) return cuerpo;

  const clic = leerClicSlack(cuerpo);
  if (!clic) return listo();
  const dueno = await resolverInstalacionSlack(clic.teamId);
  if (!dueno) return listo();
  const sistema = crearContexto({
    tenantId: dueno.tenantId,
    actor: { tipo: "system" },
    medidor: medidorDiferido,
  });
  const efimero = async (texto: string) => {
    if (!clic.canal) return;
    await executeCapability(sistema, "core.slack.efimero", {
      canal: clic.canal,
      slackUserId: clic.slackUserId,
      texto,
      ...(clic.hiloTs ? { hiloTs: clic.hiloTs } : {}),
    });
  };

  const v = await executeCapability(sistema, "core.slack.vinculado_de", {
    teamId: clic.teamId,
    slackUserId: clic.slackUserId,
  });
  const userId = v.ok ? (v.data as { userId: string | null }).userId : null;
  const ctx = userId ? await contextoDeVinculado(dueno.tenantId, userId) : null;
  if (!ctx) {
    await efimero(SIN_VINCULO);
    return listo();
  }
  const capacidad = ACCIONES_SLACK[clic.accion];
  if (!capacidad) {
    await efimero(RESPONDER);
    return listo();
  }
  const r = await executeCapability(
    ctx,
    capacidad,
    { avisoId: clic.avisoId },
    { idempotencyKey: `slack:${clic.teamId}:${clic.slackUserId}:${clic.actionTs}` },
  );
  if (!r.ok)
    await efimero(
      r.error.code === "FORBIDDEN" || r.error.code === "NOT_FOUND"
        ? "No tienes permiso para gestionar este aviso en OPAI, así que no se hizo nada."
        : r.error.message,
    );
  return listo();
}

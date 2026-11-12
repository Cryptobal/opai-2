// Mensajes de Slack de los avisos de terreno (CAR-293). Texto escapado; los botones llevan solo el id
// del aviso (F4 resuelve la acción en OPAI como el usuario vinculado, ADR-093 §1).
import { type BloqueSlack, escaparSlack } from "@opai/integrations";

import type { TipoAviso } from "./registrar";

export const ACCION_TOMAR = "opai.aviso.tomar";
export const ACCION_CERRAR = "opai.aviso.cerrar";
export const ACCION_REFUERZO = "opai.aviso.refuerzo";
export const ACCION_RESPONDER = "opai.aviso.responder";
export const ACCION_VER = "opai.aviso.ver";

const ICONO: Record<TipoAviso, string> = {
  atraso: ":hourglass_flowing_sand:",
  ausencia: ":warning:",
  fuera_de_zona: ":round_pushpin:",
  sin_relevo: ":arrows_counterclockwise:",
  incidente: ":rotating_light:",
  panico: ":sos:",
  mensaje_guardia: ":speech_balloon:",
};

export type AvisoParaSlack = {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  detalle: string | null;
  enlace: string | null;
  gestion: "abierto" | "tomado" | "cerrado";
  /** «Tomado por Ana a las 10:32»; lo arma F4 al actualizar el mensaje. */
  estadoTexto?: string | null;
};

/** URL absoluta de OPAI, solo https y sin caracteres que rompan el formato de Slack. */
export function urlOpai(enlace: string | null, base: string): string | null {
  if (!enlace) return null;
  try {
    const u = new URL(enlace, base);
    return u.protocol === "https:" && !/[\s|<>]/.test(u.toString()) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Bloques del aviso: título, detalle, estado y botones «Tomar» (si sigue abierto) y «Ver en OPAI». */
/** Texto escapado y recortado bajo el tope de 3000 caracteres de un bloque de Slack. */
const seguro = (t: string) => escaparSlack(t).slice(0, 2900);

export function bloquesAviso(a: AvisoParaSlack, base: string): BloqueSlack[] {
  const bloques: BloqueSlack[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `${ICONO[a.tipo]} *${seguro(a.titulo)}*` },
    },
  ];
  if (a.detalle)
    bloques.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: seguro(a.detalle) }],
    });
  if (a.estadoTexto)
    bloques.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: seguro(a.estadoTexto) }],
    });
  const botones: Extract<BloqueSlack, { type: "actions" }>["elements"] = [];
  const boton = (action_id: string, text: string, style?: "primary" | "danger") => ({
    type: "button" as const,
    action_id,
    text: { type: "plain_text" as const, text },
    value: a.id,
    ...(style ? { style } : {}),
  });
  // Botones según la gestión en OPAI (F4): abierto → Tomar; tomado → Cerrar y Pedir refuerzo.
  if (a.gestion === "abierto")
    botones.push(boton(ACCION_TOMAR, "Tomar", a.tipo === "panico" ? "danger" : "primary"));
  if (a.gestion === "tomado")
    botones.push(
      boton(ACCION_CERRAR, "Cerrar", "primary"),
      boton(ACCION_REFUERZO, "Pedir refuerzo"),
    );
  if (a.gestion !== "cerrado") botones.push(boton(ACCION_RESPONDER, "Responder"));
  const url = urlOpai(a.enlace, base);
  if (url)
    botones.push({
      type: "button",
      action_id: ACCION_VER,
      text: { type: "plain_text", text: "Ver en OPAI" },
      url,
    });
  if (botones.length)
    bloques.push({ type: "actions", block_id: `opai.aviso.${a.id}`, elements: botones });
  return bloques;
}

/** Mensaje padre del hilo de una instalación en un día. */
export const textoPadreHilo = (instalacion: string, fecha: string) =>
  `Avisos de ${instalacion} · ${fecha.split("-").reverse().join("-")}`;

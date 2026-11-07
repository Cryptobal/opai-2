import { ajuste, type Contexto, prohibido } from "@opai/capabilities";

import { type Canal, PROPOSITO_TELEFONO, type ResultadoIdentidad } from "../domain";

/**
 * Canal por el que se marca (D-01): el kiosco de la instalación es el principal; el teléfono personal solo
 * si la empresa lo permite, la instalación lo incluye, RR. HH. habilitó a la persona y esta aceptó (T-04).
 */
export async function exigirCanal(ctx: Contexto, instalacionId: string, personaId: string, canal: Canal | undefined): Promise<void> {
  const mapa = await ajuste<Record<string, Canal[]>>(ctx, "asistencia", "canales_por_instalacion");
  const permitidos = mapa[instalacionId] ?? ["kiosco"];
  if ((canal ?? "kiosco") === "kiosco") {
    if (!permitidos.includes("kiosco")) throw prohibido("Esta instalación no marca en el kiosco.");
    return;
  }
  if (!(await ajuste<boolean>(ctx, "asistencia", "telefono_personal_permitido")) || !permitidos.includes("telefono_personal"))
    throw prohibido("Esta instalación no permite marcar desde el teléfono personal.");
  const [cred, ultimo] = await Promise.all([
    ctx.db.credencialTerreno.findUnique({ where: { personaId }, select: { telefonoPersonalHabilitado: true } }),
    // Consentimiento por Cumplimiento (append-only): vale el último hecho de la finalidad (uuid7 ordena por creación).
    ctx.db.consentimiento.findFirst({
      where: { titularTipo: "persona", titularId: personaId, proposito: PROPOSITO_TELEFONO }, orderBy: { id: "desc" }, select: { estado: true },
    }),
  ]);
  if (!cred?.telefonoPersonalHabilitado) throw prohibido("RR. HH. aún no te habilitó para marcar desde tu teléfono.");
  if (ultimo?.estado !== "otorgado") throw prohibido("Antes de marcar desde tu teléfono debes aceptar su uso.");
}

/**
 * El equipo del kiosco: sin sesión actúa como sistema y SU dispositivo es la credencial, así que debe venir, estar
 * activo y ser de la instalación donde se marca. Si viene en una sesión de usuario también se valida (no basta declararlo).
 */
export async function exigirEquipo(ctx: Contexto, dispositivoId: string | undefined, instalacionId: string): Promise<void> {
  if (!dispositivoId) {
    if (ctx.actor.tipo === "system") throw prohibido("Falta el equipo emparejado de la instalación.");
    return;
  }
  const d = await ctx.db.dispositivo.findFirst({ where: { id: dispositivoId }, select: { estado: true, instalacionId: true } });
  if (!d || d.estado !== "activo" || d.instalacionId !== instalacionId)
    throw prohibido("Este equipo no está autorizado para marcar en esta instalación.");
}

type Fallo = Extract<ResultadoIdentidad, { ok: false }>["motivo"];

export const MENSAJE_IDENTIDAD: Record<Fallo, string> = {
  credencial_invalida: "RUT o PIN incorrectos. Revisa tus datos o pide ayuda a RR. HH.",
  bloqueado: "Demasiados intentos. Vuelve a intentarlo en unos minutos.",
  metodo_no_disponible: "Ese método no está disponible ahora. Usa tu PIN.",
  rostro_no_coincide: "No pudimos reconocer tu rostro. Intenta de nuevo o usa tu PIN.",
  vida_fallida: "No pudimos confirmar la prueba de vida. Intenta de nuevo o usa tu PIN.",
  sin_enrolamiento: "No tienes tu rostro enrolado. Usa tu PIN.",
  proveedor_caido: "El reconocimiento facial no respondió. Usa tu PIN.",
};

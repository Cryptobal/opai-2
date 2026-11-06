import { ajuste, biometriaDe, cifradoDeCampos, type Contexto } from "@opai/capabilities";

import { consentimientoVigente, decidirRostro, umbralSeguro, type ResultadoIdentidad } from "../domain";

/** ¿Puede esta empresa usar el rostro ahora? (interruptor propio, plataforma y empresas de prueba, D-02). */
export async function rostroPermitido(ctx: Contexto): Promise<boolean> {
  if (!(await ajuste<boolean>(ctx, "asistencia", "rostro_habilitado"))) return false;
  if (await ajuste<boolean>(ctx, "asistencia", "biometria_empresas_reales")) return true;
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true } });
  return !!t?.slug.startsWith("qa-");
}

/**
 * Verificación 1:1 del rostro de la persona (T-03): exige consentimiento vigente, enrolamiento activo y una
 * prueba de vida superada; solo entonces compara contra SU referencia en la colección de SU empresa.
 */
export async function verificarRostro(
  ctx: Contexto, personaId: string, sesionVidaId: string | undefined,
): Promise<ResultadoIdentidad> {
  const bio = (await rostroPermitido(ctx)) ? await biometriaDe(ctx) : null;
  if (!bio) return { ok: false, motivo: "metodo_no_disponible" };
  const [enrol, consentimientos] = await Promise.all([
    ctx.db.enrolamientoFacial.findUnique({ where: { tenantId_personaId: { tenantId: ctx.tenantId, personaId } } }),
    ctx.db.consentimientoPersona.findMany({ where: { personaId, tipo: "biometria_facial" } }),
  ]);
  const consentido = consentimientoVigente(consentimientos.map((c) => ({ ...c, tipo: "biometria_facial" as const })), "biometria_facial");
  if (!enrol || enrol.estado !== "activo" || !enrol.referencia || !consentido) return { ok: false, motivo: "sin_enrolamiento" };
  if (!sesionVidaId) return { ok: false, motivo: "vida_fallida" };
  const vida = await bio.resultadoVida(sesionVidaId).catch(() => null);
  if (!vida?.viva || !vida.imagen) return { ok: false, motivo: "vida_fallida" };
  const referencia = await cifradoDeCampos(ctx).descifrar("enrolamientos_faciales", "referencia", enrol.referencia);
  const umbral = umbralSeguro(await ajuste<number>(ctx, "asistencia", "biometria_umbral_similitud"));
  const r = await bio.verificar(referencia, vida.imagen, umbral);
  const d = decidirRostro({ viva: true, coincide: r.coincide, similitud: r.similitud }, umbral);
  return d.ok
    ? { ok: true, metodo: "rostro", motivoRespaldo: null, confianza: d.similitud, pruebaVida: true }
    : { ok: false, motivo: d.motivo };
}

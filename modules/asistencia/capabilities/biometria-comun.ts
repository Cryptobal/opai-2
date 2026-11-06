import { ajuste, biometriaDe, cifradoDeCampos, type Contexto, prohibido, reglaDeNegocio } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { consentimientoVigente, faltantesEnrolamiento } from "../domain";

type MotivoBaja = "trabajador" | "rrhh" | "consentimiento" | "desvinculacion";

/**
 * Guardia de la biometría real (Ley 21.719): solo empresas de prueba (slug `qa-…`) hasta que Carlos confirme
 * la evaluación de impacto y el DPA y encienda el ajuste de plataforma.
 */
export async function exigirBiometriaPermitida(ctx: Contexto): Promise<void> {
  if (await ajuste<boolean>(ctx, "asistencia", "biometria_empresas_reales")) return;
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true } });
  if (!t?.slug.startsWith("qa-"))
    throw prohibido("La biometría facial aún no está autorizada para empresas reales. Marca con RUT y PIN.");
}

/** Lo que falta para enrolar a una persona (lista vacía = puede enrolarse). */
export async function faltantesDe(ctx: Contexto, personaId: string): Promise<string[]> {
  const [persona, vinculo, consentimientos] = await Promise.all([
    ctx.db.persona.findFirst({ where: { id: personaId, archivadaEn: null, anonimizadaEn: null }, select: { emailPersonal: true } }),
    ctx.db.vinculoLaboral.findFirst({ where: { personaId, estado: "vigente" }, select: { id: true } }),
    ctx.db.consentimientoPersona.findMany({ where: { personaId, tipo: "biometria_facial" } }),
  ]);
  if (!persona) throw reglaDeNegocio("La persona no existe o está archivada.");
  return faltantesEnrolamiento({
    consentimiento: consentimientoVigente(consentimientos.map((c) => ({ ...c, tipo: "biometria_facial" as const })), "biometria_facial"),
    correoPersonal: !!persona.emailPersonal?.trim(),
    vinculoVigente: !!vinculo,
  });
}

type Enrolamiento = { id: string; personaId: string; referencia: string | null };

/**
 * Destruye la biometría de una persona: la borra en el proveedor y deja la referencia en null (L-14, L-15).
 * Si el proveedor no responde NO toca la base —no se pierde la referencia— y avisa para reintentar; mientras
 * tanto el rostro no se puede usar porque el consentimiento ya está revocado o el vínculo terminó.
 */
export async function darDeBaja(ctx: Contexto, e: Enrolamiento, motivo: MotivoBaja): Promise<void> {
  if (e.referencia) {
    const bio = await biometriaDe(ctx);
    // Sin proveedor no se puede borrar la plantilla: no se pierde la referencia (quedaría viva sin forma de borrarla).
    if (!bio) throw reglaDeNegocio("La biometría no está configurada: no se puede borrar el rostro en el proveedor todavía.");
    const ref = await cifradoDeCampos(ctx).descifrar("enrolamientos_faciales", "referencia", e.referencia);
    await bio.eliminarRostro(ref).catch(() => {
      throw reglaDeNegocio("No se pudo borrar el rostro en el proveedor. Se reintentará; mientras tanto no se usa.");
    });
  }
  await ctx.transaccion(async (tx: TenantTx) => {
    await tx.enrolamientoFacial.update({
      where: { id: e.id },
      data: { estado: motivo === "desvinculacion" ? "suprimido" : "revocado", referencia: null, revocadoEn: new Date(), motivoBaja: motivo },
    });
    await ctx.bitacora.registrar(tx, {
      tipo: "asistencia.biometria.suprimida", entidadTipo: "enrolamiento_facial", entidadId: e.id,
      payload: { personaId: e.personaId, motivo },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "asistencia.biometria.suprimida", entidadTipo: "enrolamiento_facial", entidadId: e.id,
      payload: { enrolamientoId: e.id, personaId: e.personaId, motivo },
    });
  });
}

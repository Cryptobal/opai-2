import { defineConsumidor, type EventoPublicado } from "../../eventos/consumidores";
import type { Contexto } from "../../types";
import { borrarEnrolamiento } from "./borrado";
import { EVENTO_ANONIMIZACION, PROPOSITO_BIOMETRIA } from "./comun";

type Titular = { tipo?: unknown; id?: unknown };

/**
 * Revocar el consentimiento de reconocimiento facial, o anonimizar a la persona, borra el rostro enrolado (Ley 21.719): en el proveedor y
 * la referencia local. Es idempotente: el despacho reintenta hasta lograrlo, y si ya no hay enrolamiento no hace nada.
 */
export const consumidorRevocacionBiometria = defineConsumidor({
  id: "core.biometria.revocacion",
  descripcion:
    "Borra el rostro enrolado de una persona cuando revoca su consentimiento de reconocimiento facial.",
  eventos: ["core.cumplimiento.consentimiento_revocado", EVENTO_ANONIMIZACION],
  async handler(ctx: Contexto, evento: EventoPublicado) {
    // Anonimizar a la persona (a su pedido o por retención) también borra su rostro.
    if (evento.tipo === EVENTO_ANONIMIZACION) {
      if (evento.entidadId) await borrarEnrolamiento(ctx, evento.entidadId, "persona_anonimizada");
      return;
    }
    const p = evento.payload as { titular?: Titular; proposito?: unknown } | null;
    if (p?.proposito !== PROPOSITO_BIOMETRIA) return;
    if (p.titular?.tipo !== "persona" || typeof p.titular.id !== "string") return;
    if (!evento.entidadId) return;
    await borrarEnrolamiento(ctx, p.titular.id, "consentimiento_revocado", evento.entidadId);
  },
});

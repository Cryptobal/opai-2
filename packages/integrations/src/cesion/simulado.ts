import type { AdaptadorCesion, PayloadCesion, ResultadoConsultaCesion, ResultadoEnvioCesion } from "./tipos";

export function adaptadorCesionSimulado(): AdaptadorCesion {
  return {
    nombre: "simulado",
    disponible: true,
    async enviar(payload: PayloadCesion): Promise<ResultadoEnvioCesion> {
      return { operacionExternaId: `SIM-CES-${payload.folio}`, estado: "enviada" };
    },
    async consultar(id: string): Promise<ResultadoConsultaCesion> {
      if (id.includes("RECHAZO")) return { estado: "anulada", glosa: "Rechazo simulado" };
      return { estado: "aprobada" };
    },
  };
}

// SII simulado determinista para tests y desarrollo (CAR-137). Sin certificados ni red.

import type {
  AdaptadorSii,
  ConsultaSiiResultado,
  DteXmlFirmado,
  EnvioSiiResultado,
  PayloadEmisionDte,
} from "./tipos";

function timbreFake(payload: PayloadEmisionDte): string {
  return `PDF417-SIM|${payload.tipoDte}|${payload.folio}|${payload.rutEmisor}|${payload.montos.total}`;
}

export function adaptadorSiiSimulado(): AdaptadorSii {
  return {
    nombre: "simulado",
    disponible: true,
    async firmar(payload: PayloadEmisionDte): Promise<DteXmlFirmado> {
      const xml = [
        "<DTE>",
        `<TipoDTE>${payload.tipoDte}</TipoDTE>`,
        `<Folio>${payload.folio}</Folio>`,
        `<MntTotal>${payload.montos.total}</MntTotal>`,
        "</DTE>",
      ].join("");
      return { xml, timbrePdf417: timbreFake(payload) };
    },
    async enviar(_xml: string, _ambiente: PayloadEmisionDte["ambiente"]): Promise<EnvioSiiResultado> {
      return { trackId: `SIM-${Date.now()}`, estado: "enviado" };
    },
    async consultar(trackId: string, _ambiente: PayloadEmisionDte["ambiente"]): Promise<ConsultaSiiResultado> {
      if (trackId.includes("RECHAZO")) return { estado: "rechazado", glosa: "Rechazo simulado" };
      return { estado: "aceptado" };
    },
  };
}

// Cliente SimpleAPI para emisión DTE (CAR-140). Sin secretos en logs; credenciales las inyecta el borde.

import type {
  AdaptadorSii,
  AmbienteSii,
  ConsultaSiiResultado,
  DteXmlFirmado,
  EnvioSiiResultado,
  PayloadEmisionDte,
} from "./tipos";
import { adaptadorSiiSimulado } from "./simulado";

export type CredencialesSimpleApi = {
  apiKey: string;
  certificadoPfx: string;
  certificadoClave: string;
};

const BASE = {
  certificacion: "https://api.simpleapi.cl/v2",
  produccion: "https://api.simpleapi.cl/v2",
} as const;

async function postJson(url: string, apiKey: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mapearEstadoConsulta(raw: string | undefined, glosa?: string): ConsultaSiiResultado {
  const e = raw?.trim().toLowerCase() ?? "";
  if (e === "aceptado" || e === "accepted") return { estado: "aceptado", ...(glosa ? { glosa } : {}) };
  if (e === "rechazado" || e === "rejected") return { estado: "rechazado", ...(glosa ? { glosa } : {}) };
  if (e === "reparo" || e === "aceptado con reparos" || e.includes("reparo")) {
    return { estado: "reparo", ...(glosa ? { glosa } : {}) };
  }
  if (e === "pendiente") return { estado: "pendiente", ...(glosa ? { glosa } : {}) };
  return { estado: "pendiente", ...(glosa ? { glosa } : {}) };
}

/** Adaptador productivo; si faltan credenciales, queda no disponible. */
export function adaptadorSimpleApi(creds: CredencialesSimpleApi | null): AdaptadorSii {
  const sim = adaptadorSiiSimulado();
  const disponible = Boolean(creds?.apiKey && creds.certificadoPfx && creds.certificadoClave);
  return {
    nombre: "simpleapi",
    disponible,
    async firmar(payload: PayloadEmisionDte): Promise<DteXmlFirmado> {
      if (!disponible || !creds) throw new Error("SimpleAPI no configurado.");
      const res = await postJson(`${BASE[payload.ambiente]}/dte/firmar`, creds.apiKey, {
        ...payload,
        certificadoPfx: creds.certificadoPfx,
        certificadoClave: creds.certificadoClave,
      });
      if (!res.ok) throw new Error(`SimpleAPI firmar: HTTP ${res.status}`);
      const data = (await res.json()) as { xml?: string; timbrePdf417?: string };
      if (!data.xml || !data.timbrePdf417) throw new Error("SimpleAPI firmar: respuesta incompleta.");
      return { xml: data.xml, timbrePdf417: data.timbrePdf417 };
    },
    async enviar(xmlFirmado: string, ambiente: AmbienteSii): Promise<EnvioSiiResultado> {
      if (!disponible || !creds) throw new Error("SimpleAPI no configurado.");
      const res = await postJson(`${BASE[ambiente]}/dte/enviar`, creds.apiKey, { xml: xmlFirmado, ambiente });
      if (!res.ok) throw new Error(`SimpleAPI enviar: HTTP ${res.status}`);
      const data = (await res.json()) as { trackId?: string; glosa?: string };
      if (!data.trackId) throw new Error("SimpleAPI enviar: sin trackId.");
      return { trackId: data.trackId, estado: "enviado", ...(data.glosa ? { glosa: data.glosa } : {}) };
    },
    async consultar(trackId: string, ambiente: AmbienteSii): Promise<ConsultaSiiResultado> {
      if (!disponible || !creds) return sim.consultar(trackId, ambiente);
      const res = await postJson(`${BASE[ambiente]}/dte/consultar`, creds.apiKey, { trackId, ambiente });
      if (!res.ok) throw new Error(`SimpleAPI consultar: HTTP ${res.status}`);
      const data = (await res.json()) as { estado?: string; glosa?: string };
      return mapearEstadoConsulta(data.estado, data.glosa);
    },
  };
}

// Adaptador de Google (generateContent) con functionDeclarations y stream SSE. Salida estructurada:
// responseMimeType + responseSchema (Gemini no necesita una herramienta). Sin SDK.
import type {
  EventoStream,
  LlamadaHerramienta,
  MotivoTermino,
  ProveedorIa,
  RespuestaConversacion,
  SolicitudConversacion,
} from "./contrato";
import { completarDesdeConversar, cuerpo, leerSSE, pedir } from "./http";

const base = "https://generativelanguage.googleapis.com/v1beta/models";
const cabeceras = (apiKey: string) => ({ "x-goog-api-key": apiKey, "content-type": "application/json" });

const objeto = (texto: string): Record<string, unknown> => {
  try {
    const v: unknown = JSON.parse(texto);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : { resultado: texto };
  } catch {
    return { resultado: texto };
  }
};

type Parte = { text?: string; functionCall?: { name?: string; args?: unknown } };

function peticion(s: SolicitudConversacion) {
  const sistema = s.mensajes.filter((m) => m.rol === "sistema").map((m) => m.texto).join("\n");
  const contents = s.mensajes.flatMap((m): Record<string, unknown>[] => {
    if (m.rol === "usuario") return [{ role: "user", parts: [{ text: m.texto }] }];
    if (m.rol === "herramienta")
      return [{ role: "user", parts: [{ functionResponse: { name: m.nombre, response: objeto(m.resultado) } }] }];
    if (m.rol === "asistente") {
      const parts: Parte[] = [];
      if (m.texto) parts.push({ text: m.texto });
      for (const ll of m.llamadas ?? []) parts.push({ functionCall: { name: ll.nombre, args: ll.argumentos } });
      return [{ role: "model", parts }];
    }
    return [];
  });
  const tools = (s.herramientas ?? []).map((h) => ({ name: h.nombre, description: h.descripcion, parameters: h.esquema }));
  const salida = s.salidaEstructurada;
  const modo = s.eleccionHerramienta === "obligatoria" ? "ANY" : s.eleccionHerramienta === "ninguna" ? "NONE" : typeof s.eleccionHerramienta === "object" ? "ANY" : "AUTO";
  return {
    ...(sistema ? { systemInstruction: { parts: [{ text: sistema }] } } : {}),
    contents,
    ...(tools.length ? { tools: [{ functionDeclarations: tools }], toolConfig: { functionCallingConfig: { mode: modo, ...(typeof s.eleccionHerramienta === "object" ? { allowedFunctionNames: [s.eleccionHerramienta.nombre] } : {}) } } } : {}),
    generationConfig: {
      maxOutputTokens: s.maxTokens ?? 1024,
      ...(s.temperatura !== undefined ? { temperature: s.temperatura } : {}),
      ...(salida ? { responseMimeType: "application/json", responseSchema: salida.esquema } : {}),
    },
  };
}

const motivo = (razon: string | null | undefined): MotivoTermino =>
  razon === "MAX_TOKENS" ? "longitud" : razon === "SAFETY" || razon === "RECITATION" ? "filtro" : "fin";

type Candidato = { content?: { parts?: Parte[] }; finishReason?: string };
type RespG = {
  candidates?: Candidato[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

function acumular(
  cand: Candidato | undefined,
  texto: string,
  llamadas: LlamadaHerramienta[],
): { texto: string; nuevas: LlamadaHerramienta[] } {
  const nuevas: LlamadaHerramienta[] = [];
  for (const p of cand?.content?.parts ?? []) {
    if (p.text) texto += p.text;
    else if (p.functionCall?.name) {
      const llamada = { id: `call_${llamadas.length + nuevas.length}`, nombre: p.functionCall.name, argumentos: p.functionCall.args ?? {} };
      nuevas.push(llamada);
    }
  }
  return { texto, nuevas };
}

export function google(apiKey: string): ProveedorIa {
  const self: ProveedorIa = {
    id: "ia_google",
    async conversar(modelo, s) {
      const url = `${base}/${encodeURIComponent(modelo)}:generateContent`;
      const r = await pedir(url, { method: "POST", headers: cabeceras(apiKey), body: JSON.stringify(peticion(s)) }, "Google");
      const d = await cuerpo<RespG>(r, "Google");
      const cand = d.candidates?.[0];
      const { texto, nuevas } = acumular(cand, "", []);
      return {
        texto,
        llamadas: nuevas,
        uso: { tokensEntrada: d.usageMetadata?.promptTokenCount ?? 0, tokensSalida: d.usageMetadata?.candidatesTokenCount ?? 0 },
        motivo: motivo(cand?.finishReason),
        modelo,
        proveedor: "ia_google",
      };
    },
    conversarStream: (modelo, s) => streamGoogle(apiKey, modelo, s),
    completar: (modelo, s) => completarDesdeConversar(self).call(self, modelo, s),
  };
  return self;
}

async function* streamGoogle(
  apiKey: string,
  modelo: string,
  s: SolicitudConversacion,
): AsyncGenerator<EventoStream> {
  const url = `${base}/${encodeURIComponent(modelo)}:streamGenerateContent?alt=sse`;
  const r = await pedir(url, { method: "POST", headers: cabeceras(apiKey), body: JSON.stringify(peticion(s)) }, "Google");
  let texto = "";
  let entrada = 0;
  let salida = 0;
  let razon: MotivoTermino = "fin";
  const llamadas: LlamadaHerramienta[] = [];
  for await (const payload of leerSSE(r, "Google")) {
    const d = JSON.parse(payload) as RespG;
    entrada = d.usageMetadata?.promptTokenCount ?? entrada;
    salida = d.usageMetadata?.candidatesTokenCount ?? salida;
    const cand = d.candidates?.[0];
    for (const p of cand?.content?.parts ?? []) {
      if (p.text) {
        texto += p.text;
        yield { tipo: "texto", delta: p.text };
      } else if (p.functionCall?.name) {
        const llamada = { id: `call_${llamadas.length}`, nombre: p.functionCall.name, argumentos: p.functionCall.args ?? {} };
        llamadas.push(llamada);
        yield { tipo: "herramienta", llamada };
      }
    }
    if (cand?.finishReason) razon = motivo(cand.finishReason);
  }
  const respuesta: RespuestaConversacion = {
    texto,
    llamadas,
    uso: { tokensEntrada: entrada, tokensSalida: salida },
    motivo: razon,
    modelo,
    proveedor: "ia_google",
  };
  yield { tipo: "fin", respuesta };
}

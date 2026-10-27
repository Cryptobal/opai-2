// Adaptador "compatible con OpenAI" (/chat/completions) con herramientas, response_format
// json_schema y stream. Cubre OpenAI, xAI (Grok), Vercel AI Gateway, OpenRouter y otros con solo
// cambiar la base URL y el id; no hay código por proveedor. Sin SDK.
import type {
  EventoStream,
  LlamadaHerramienta,
  MotivoTermino,
  ProveedorIa,
  ProveedorIaId,
  RespuestaConversacion,
  SolicitudConversacion,
} from "./contrato";
import { completarDesdeConversar, cuerpo, leerSSE, pedir } from "./http";
import { type RespO, type ToolCall, type Uso, cabeceras, llamadasDe, motivo, peticion } from "./openai-mapa";

export function openaiCompatible(id: ProveedorIaId, apiKey: string, baseUrl: string): ProveedorIa {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const self: ProveedorIa = {
    id,
    async conversar(modelo, s) {
      const r = await pedir(url, { method: "POST", headers: cabeceras(apiKey), body: JSON.stringify(peticion(modelo, s, false)) }, "OpenAI");
      const d = await cuerpo<RespO>(r, "OpenAI");
      const choice = d.choices[0];
      return {
        texto: choice?.message.content ?? "",
        llamadas: llamadasDe(choice?.message.tool_calls),
        uso: { tokensEntrada: d.usage?.prompt_tokens ?? 0, tokensSalida: d.usage?.completion_tokens ?? 0 },
        motivo: motivo(choice?.finish_reason),
        modelo,
        proveedor: id,
      };
    },
    conversarStream: (modelo, s) => streamOpenai(id, url, apiKey, modelo, s),
    completar: (modelo, s) => completarDesdeConversar(self).call(self, modelo, s),
  };
  return self;
}

export const openai = (apiKey: string): ProveedorIa =>
  openaiCompatible("ia_openai", apiKey, "https://api.openai.com/v1");

type DeltaSSE = {
  choices?: {
    delta?: { content?: string; tool_calls?: (ToolCall & { index?: number })[] };
    finish_reason?: string | null;
  }[];
  usage?: Uso;
};

async function* streamOpenai(
  id: ProveedorIaId,
  url: string,
  apiKey: string,
  modelo: string,
  s: SolicitudConversacion,
): AsyncGenerator<EventoStream> {
  const r = await pedir(url, { method: "POST", headers: cabeceras(apiKey), body: JSON.stringify(peticion(modelo, s, true)) }, "OpenAI");
  let texto = "";
  let entrada = 0;
  let salida = 0;
  let razon: MotivoTermino = "fin";
  const parciales = new Map<number, { id: string; nombre: string; args: string }>();
  for await (const payload of leerSSE(r, "OpenAI")) {
    const ev = JSON.parse(payload) as DeltaSSE;
    if (ev.usage) {
      entrada = ev.usage.prompt_tokens ?? entrada;
      salida = ev.usage.completion_tokens ?? salida;
    }
    const choice = ev.choices?.[0];
    if (choice?.delta?.content) {
      texto += choice.delta.content;
      yield { tipo: "texto", delta: choice.delta.content };
    }
    for (const tc of choice?.delta?.tool_calls ?? []) {
      const idx = tc.index ?? 0;
      const prev = parciales.get(idx) ?? { id: "", nombre: "", args: "" };
      parciales.set(idx, {
        id: tc.id ?? prev.id,
        nombre: tc.function?.name ?? prev.nombre,
        args: prev.args + (tc.function?.arguments ?? ""),
      });
    }
    if (choice?.finish_reason) razon = motivo(choice.finish_reason);
  }
  const llamadas: LlamadaHerramienta[] = [...parciales.values()].map((p) => ({
    id: p.id,
    nombre: p.nombre,
    argumentos: p.args ? (JSON.parse(p.args) as unknown) : {},
  }));
  for (const llamada of llamadas) yield { tipo: "herramienta", llamada };
  const respuesta: RespuestaConversacion = {
    texto,
    llamadas,
    uso: { tokensEntrada: entrada, tokensSalida: salida },
    motivo: razon,
    modelo,
    proveedor: id,
  };
  yield { tipo: "fin", respuesta };
}

// Mapeo del contrato neutral al formato "compatible con OpenAI" (/chat/completions) y tipos.
import type {
  EleccionHerramienta,
  LlamadaHerramienta,
  MotivoTermino,
  SolicitudConversacion,
} from "./contrato";

export const cabeceras = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "content-type": "application/json",
});

function mensajes(s: SolicitudConversacion) {
  return s.mensajes.flatMap((m): Record<string, unknown>[] => {
    if (m.rol === "sistema") return [{ role: "system", content: m.texto }];
    if (m.rol === "usuario") return [{ role: "user", content: m.texto }];
    if (m.rol === "herramienta")
      return [{ role: "tool", tool_call_id: m.id, content: m.resultado }];
    return [
      {
        role: "assistant",
        content: m.texto ?? "",
        ...(m.llamadas?.length
          ? {
              tool_calls: m.llamadas.map((ll) => ({
                id: ll.id,
                type: "function",
                function: { name: ll.nombre, arguments: JSON.stringify(ll.argumentos ?? {}) },
              })),
            }
          : {}),
      },
    ];
  });
}

function toolChoice(e: EleccionHerramienta | undefined) {
  if (e === "obligatoria") return "required";
  if (e === "ninguna") return "none";
  if (typeof e === "object") return { type: "function", function: { name: e.nombre } };
  return "auto";
}

export function peticion(modelo: string, s: SolicitudConversacion, stream: boolean) {
  const tools = (s.herramientas ?? []).map((h) => ({
    type: "function",
    function: { name: h.nombre, description: h.descripcion, parameters: h.esquema },
  }));
  const salida = s.salidaEstructurada;
  return {
    model: modelo,
    max_completion_tokens: s.maxTokens ?? 1024,
    ...(s.temperatura !== undefined ? { temperature: s.temperatura } : {}),
    messages: mensajes(s),
    ...(tools.length ? { tools, tool_choice: toolChoice(s.eleccionHerramienta) } : {}),
    ...(salida
      ? { response_format: { type: "json_schema", json_schema: { name: salida.nombre, schema: salida.esquema, strict: true } } }
      : {}),
    ...(stream ? { stream: true, stream_options: { include_usage: true } } : {}),
  };
}

export const motivo = (razon: string | null | undefined): MotivoTermino =>
  razon === "tool_calls" ? "herramienta" : razon === "length" ? "longitud" : razon === "content_filter" ? "filtro" : "fin";

export type ToolCall = { id?: string; function?: { name?: string; arguments?: string } };
export type Uso = { prompt_tokens?: number; completion_tokens?: number } | null;
export type RespO = {
  choices: { message: { content: string | null; tool_calls?: ToolCall[] }; finish_reason: string | null }[];
  usage: Uso;
};

export const llamadasDe = (tc: ToolCall[] | undefined): LlamadaHerramienta[] =>
  (tc ?? []).map((c) => ({
    id: c.id ?? "",
    nombre: c.function?.name ?? "",
    argumentos: c.function?.arguments ? (JSON.parse(c.function.arguments) as unknown) : {},
  }));

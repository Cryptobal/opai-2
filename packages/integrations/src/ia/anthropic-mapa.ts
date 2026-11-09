// Mapeo del contrato neutral al formato de Anthropic (/v1/messages) y tipos de su respuesta.
import type { EleccionHerramienta, MotivoTermino, SolicitudConversacion } from "./contrato";

export const URL = "https://api.anthropic.com/v1/messages";
export const cabeceras = (apiKey: string) => ({
  "x-api-key": apiKey,
  "anthropic-version": "2023-06-01",
  "content-type": "application/json",
});

export type Bloque = { type: string; text?: string; id?: string; name?: string; input?: unknown };

function mensajes(s: SolicitudConversacion, originales: ReadonlyMap<number, Bloque[]>) {
  const system = s.mensajes
    .filter((m) => m.rol === "sistema")
    .map((m) => m.texto)
    .join("\n");
  const messages = s.mensajes.flatMap((m, i): Record<string, unknown>[] => {
    if (m.rol === "usuario") return [{ role: "user", content: m.texto }];
    if (m.rol === "herramienta")
      return [
        { role: "user", content: [{ type: "tool_result", tool_use_id: m.id, content: m.resultado }] },
      ];
    if (m.rol === "asistente") {
      if (originales.has(i)) return [{ role: "assistant", content: originales.get(i) }];
      const content: Bloque[] = [];
      if (m.texto) content.push({ type: "text", text: m.texto });
      for (const ll of m.llamadas ?? [])
        content.push({ type: "tool_use", id: ll.id, name: ll.nombre, input: ll.argumentos });
      return [{ role: "assistant", content }];
    }
    return [];
  });
  return { system: system || undefined, messages };
}

function toolChoice(e: EleccionHerramienta | undefined) {
  if (e === "obligatoria") return { type: "any" };
  if (e === "ninguna") return { type: "none" };
  if (typeof e === "object") return { type: "tool", name: e.nombre };
  return { type: "auto" };
}

function herramientas(s: SolicitudConversacion) {
  const salida = s.salidaEstructurada;
  const tools = [
    ...(s.herramientas ?? []).map((h) => ({
      name: h.nombre,
      description: h.descripcion,
      input_schema: h.esquema,
    })),
    ...(salida
      ? [{ name: salida.nombre, description: "Devuelve la salida estructurada.", input_schema: salida.esquema }]
      : []),
  ];
  if (tools.length === 0) return {};
  return {
    tools,
    tool_choice: salida ? { type: "tool", name: salida.nombre } : toolChoice(s.eleccionHerramienta),
  };
}

export function peticion(modelo: string, s: SolicitudConversacion, stream: boolean, originales: ReadonlyMap<number, Bloque[]> = new Map()) {
  return {
    model: modelo,
    max_tokens: s.maxTokens ?? 1024,
    ...(s.temperatura !== undefined ? { temperature: s.temperatura } : {}),
    ...mensajes(s, originales),
    ...herramientas(s),
    stream,
  };
}

export const motivo = (razon: string | null | undefined): MotivoTermino =>
  razon === "tool_use" ? "herramienta" : razon === "max_tokens" ? "longitud" : "fin";

export type RespA = {
  content: Bloque[];
  usage: { input_tokens: number; output_tokens: number };
  stop_reason: string | null;
};

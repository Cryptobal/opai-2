// Adaptador de Anthropic (/v1/messages) con herramientas y stream SSE. Salida estructurada: una
// herramienta forzada cuyo input es la salida (Anthropic no tiene response_format). Sin SDK.
import { type RespA, URL, cabeceras, motivo, peticion } from "./anthropic-mapa";
import type {
  EventoStream,
  LlamadaHerramienta,
  MotivoTermino,
  ProveedorIa,
  RespuestaConversacion,
  SolicitudConversacion,
} from "./contrato";
import { sanear } from "./error-proveedor";
import { ErrorIa, completarDesdeConversar, cuerpo, leerSSE, pedir } from "./http";

export function anthropic(apiKey: string): ProveedorIa {
  const self: ProveedorIa = {
    id: "ia_anthropic",
    async conversar(modelo, s) {
      const r = await pedir(URL, { method: "POST", headers: cabeceras(apiKey), body: JSON.stringify(peticion(modelo, s, false)) }, "Anthropic");
      const d = await cuerpo<RespA>(r, "Anthropic", apiKey);
      let texto = "";
      const llamadas: LlamadaHerramienta[] = [];
      for (const b of d.content) {
        if (b.type === "text") texto += b.text ?? "";
        else if (b.type === "tool_use" && b.id && b.name) {
          if (s.salidaEstructurada?.nombre === b.name) texto = JSON.stringify(b.input ?? {});
          else llamadas.push({ id: b.id, nombre: b.name, argumentos: b.input });
        }
      }
      return {
        texto,
        llamadas,
        uso: { tokensEntrada: d.usage.input_tokens, tokensSalida: d.usage.output_tokens },
        motivo: motivo(d.stop_reason),
        modelo,
        proveedor: "ia_anthropic",
      };
    },
    conversarStream: (modelo, s) => streamAnthropic(apiKey, modelo, s),
    completar: (modelo, s) => completarDesdeConversar(self).call(self, modelo, s),
  };
  return self;
}

type EventoSSE = {
  type: string;
  error?: { type?: string; message?: string };
  index?: number;
  message?: { usage?: { input_tokens?: number } };
  content_block?: { type?: string; id?: string; name?: string };
  delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string };
  usage?: { output_tokens?: number };
};

async function* streamAnthropic(
  apiKey: string,
  modelo: string,
  s: SolicitudConversacion,
): AsyncGenerator<EventoStream> {
  const r = await pedir(URL, { method: "POST", headers: cabeceras(apiKey), body: JSON.stringify(peticion(modelo, s, true)) }, "Anthropic");
  let texto = "";
  let entrada = 0;
  let salida = 0;
  let razon: MotivoTermino = "fin";
  let termino = false;
  const llamadas: LlamadaHerramienta[] = [];
  const bloques = new Map<number, { id: string; nombre: string; json: string }>();
  for await (const payload of leerSSE(r, "Anthropic", apiKey)) {
    const ev = JSON.parse(payload) as EventoSSE;
    if (ev.type === "error") {
      const detalle = ev.error?.message ? `: ${sanear(`${ev.error.type ?? "error"} · ${ev.error.message}`, apiKey)}` : ".";
      throw new ErrorIa("Anthropic", null, `Anthropic: el stream reportó un error${detalle}`);
    }
    if (ev.type === "message_stop") termino = true;
    else if (ev.type === "message_start") {
      entrada = ev.message?.usage?.input_tokens ?? 0;
      // Uso parcial ya conocido: permite medir la entrada aunque el stream se corte antes del fin.
      yield { tipo: "uso", uso: { tokensEntrada: entrada, tokensSalida: salida } };
    } else if (ev.type === "content_block_start" && ev.content_block?.type === "tool_use")
      bloques.set(ev.index ?? 0, { id: ev.content_block.id ?? "", nombre: ev.content_block.name ?? "", json: "" });
    else if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
      texto += ev.delta.text ?? "";
      yield { tipo: "texto", delta: ev.delta.text ?? "" };
    } else if (ev.type === "content_block_delta" && ev.delta?.type === "input_json_delta") {
      const b = bloques.get(ev.index ?? 0);
      if (b) b.json += ev.delta.partial_json ?? "";
    } else if (ev.type === "content_block_stop") {
      const b = bloques.get(ev.index ?? 0);
      if (b) {
        const argumentos: unknown = b.json ? JSON.parse(b.json) : {};
        if (s.salidaEstructurada?.nombre === b.nombre) texto = JSON.stringify(argumentos);
        else {
          const llamada = { id: b.id, nombre: b.nombre, argumentos };
          llamadas.push(llamada);
          yield { tipo: "herramienta", llamada };
        }
      }
    } else if (ev.type === "message_delta") {
      salida = ev.usage?.output_tokens ?? salida;
      yield { tipo: "uso", uso: { tokensEntrada: entrada, tokensSalida: salida } };
      if (ev.delta?.stop_reason) {
        razon = motivo(ev.delta.stop_reason);
        termino = true;
      }
    }
  }
  // Sin `message_delta`/`message_stop` el stream se cortó: lanzamos en vez de dar un fin falso.
  if (!termino) throw new ErrorIa("Anthropic", null, "Anthropic: stream incompleto.");
  const respuesta: RespuestaConversacion = {
    texto,
    llamadas,
    uso: { tokensEntrada: entrada, tokensSalida: salida },
    motivo: razon,
    modelo,
    proveedor: "ia_anthropic",
  };
  yield { tipo: "fin", respuesta };
}

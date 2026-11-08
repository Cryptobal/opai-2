import type { Mensaje, RespuestaConversacion, SolicitudConversacion } from "./contrato";

export const privados = [
  "THINKING_PRIVADO_FIXTURE",
  "FIRMA_PRIVADA_FIXTURE",
  "REDACTED_PRIVADO_FIXTURE",
];
export const bloques = (id = "t1") => [
  { type: "thinking", thinking: privados[0], signature: privados[1] },
  { type: "text", text: "Antes" },
  { type: "tool_use", id, name: "buscar", input: { q: "x" } },
  { type: "text", text: "Después" },
  { type: "redacted_thinking", data: privados[2] },
];
export const respuestaHttp = (content: unknown = bloques()) =>
  Response.json({
    content,
    usage: { input_tokens: 10, output_tokens: 4 },
    stop_reason: "tool_use",
  });
export const solicitud = (): SolicitudConversacion => ({
  mensajes: [
    { rol: "sistema", texto: "Sistema" },
    { rol: "usuario", texto: "Consulta" },
  ],
  herramientas: [{ nombre: "buscar", descripcion: "Busca", esquema: { type: "object" } }],
});
export function continuar(
  s: SolicitudConversacion,
  r: RespuestaConversacion,
): SolicitudConversacion {
  const mensaje: Mensaje = {
    rol: "asistente",
    texto: r.texto,
    llamadas: r.llamadas,
    ...(r.continuidad ? { continuidad: r.continuidad } : {}),
  };
  return {
    ...s,
    mensajes: [
      ...s.mensajes,
      mensaje,
      ...r.llamadas.map((ll): Mensaje => ({
        rol: "herramienta",
        id: ll.id,
        nombre: ll.nombre,
        resultado: "Resultado sintético",
      })),
    ],
  };
}

export const sseContinuidad = (privado: boolean, fin = true, posterior = false) => {
  const pensamiento = [
    { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } },
    {
      type: "content_block_delta",
      index: 0,
      delta: { type: "thinking_delta", thinking: privados[0] },
    },
    {
      type: "content_block_delta",
      index: 0,
      delta: { type: "signature_delta", signature: privados[1] },
    },
    {
      type: "content_block_start",
      index: 2,
      content_block: { type: "redacted_thinking", data: privados[2] },
    },
  ];
  const ev = [
    { type: "message_start", message: { usage: { input_tokens: 10 } } },
    ...(privado && !posterior ? pensamiento : []),
    {
      type: "content_block_start",
      index: 1,
      content_block: { type: "tool_use", id: "t1", name: "buscar" },
    },
    {
      type: "content_block_delta",
      index: 1,
      delta: { type: "input_json_delta", partial_json: "{}" },
    },
    { type: "content_block_stop", index: 1 },
    ...(privado && posterior ? pensamiento : []),
    ...(fin
      ? [
          {
            type: "message_delta",
            delta: { stop_reason: "tool_use" },
            usage: { output_tokens: 4 },
          },
          { type: "message_stop" },
        ]
      : []),
  ];
  return new Response(ev.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""), {
    headers: { "content-type": "text/event-stream" },
  });
};

/** SSE que emite iniciado/resultado/error; cancelar el stream no aborta la promesa. */
export function sseCorrida(corrida: Promise<unknown>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controlador) {
      const enviar = (evento: string, dato: unknown) => {
        try {
          controlador.enqueue(encoder.encode(`event: ${evento}\ndata: ${JSON.stringify(dato)}\n\n`));
        } catch {
          /* cliente ya no lee el stream */
        }
      };
      enviar("iniciado", {});
      try {
        enviar("resultado", await corrida);
      } catch {
        enviar("error", { mensaje: "No se pudo completar la solicitud." });
      }
      try {
        controlador.close();
      } catch {
        /* ya cerrado */
      }
    },
    cancel() {
      /* no cancela la corrida: after() y la promesa compartida la mantienen */
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

import { afterEach, describe, expect, it, vi } from "vitest";

import type { EventoStream } from "./contrato";
import { ErrorIa } from "./http";
import { proveedorIa } from "./proveedores";

/** Arma una `Response` con un cuerpo SSE a partir de eventos JSON. */
function sse(eventos: unknown[]): Response {
  const cuerpo = eventos.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(cuerpo, { headers: { "content-type": "text/event-stream" } });
}

async function recolectar(it: AsyncIterable<EventoStream>): Promise<EventoStream[]> {
  const out: EventoStream[] = [];
  for await (const ev of it) out.push(ev);
  return out;
}

describe("conversación con herramientas por HTTP (ADR-049)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("Anthropic: pide una herramienta y recibe su resultado de vuelta", async () => {
    const cuerpos: string[] = [];
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      cuerpos.push(String(init.body));
      return cuerpos.length === 1
        ? Response.json({
            content: [
              { type: "text", text: "busco" },
              { type: "tool_use", id: "t1", name: "buscar", input: { q: "x" } },
            ],
            usage: { input_tokens: 10, output_tokens: 4 },
            stop_reason: "tool_use",
          })
        : Response.json({
            content: [{ type: "text", text: "listo" }],
            usage: { input_tokens: 20, output_tokens: 2 },
            stop_reason: "end_turn",
          });
    });
    vi.stubGlobal("fetch", f);
    const prov = proveedorIa("ia_anthropic", "sk-ant");
    const herramientas = [{ nombre: "buscar", descripcion: "Busca algo.", esquema: { type: "object" } }];
    const r1 = await prov.conversar("m", { mensajes: [{ rol: "usuario", texto: "hola" }], herramientas });
    expect(r1.motivo).toBe("herramienta");
    expect(r1.llamadas).toEqual([{ id: "t1", nombre: "buscar", argumentos: { q: "x" } }]);
    const r2 = await prov.conversar("m", {
      mensajes: [
        { rol: "usuario", texto: "hola" },
        { rol: "asistente", texto: "busco", llamadas: r1.llamadas },
        { rol: "herramienta", id: "t1", nombre: "buscar", resultado: '{"hits":1}' },
      ],
      herramientas,
    });
    expect(r2.texto).toBe("listo");
    expect(cuerpos[1]).toContain("tool_result");
    expect(cuerpos[1]).toContain("tool_use");
  });

  it("Anthropic: el stream entrega texto, llamada y fin con uso", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sse([
          { type: "message_start", message: { usage: { input_tokens: 7 } } },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "ho" } },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "la" } },
          { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "t9", name: "f" } },
          { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"a":1}' } },
          { type: "content_block_stop", index: 1 },
          { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 5 } },
          { type: "message_stop" },
        ]),
      ),
    );
    const eventos = await recolectar(
      proveedorIa("ia_anthropic", "k").conversarStream("m", { mensajes: [{ rol: "usuario", texto: "x" }] }),
    );
    const textos = eventos.filter((e) => e.tipo === "texto").map((e) => (e.tipo === "texto" ? e.delta : ""));
    expect(textos.join("")).toBe("hola");
    const llamada = eventos.find((e) => e.tipo === "herramienta");
    expect(llamada?.tipo === "herramienta" && llamada.llamada).toEqual({ id: "t9", nombre: "f", argumentos: { a: 1 } });
    const fin = eventos.at(-1);
    expect(fin?.tipo === "fin" && fin.respuesta.uso).toEqual({ tokensEntrada: 7, tokensSalida: 5 });
  });

  it("OpenAI: salida estructurada pide response_format json_schema y devuelve el JSON en texto", async () => {
    let body = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        body = String(init.body);
        return Response.json({
          choices: [{ message: { content: '{"n":3}' }, finish_reason: "stop" }],
          usage: { prompt_tokens: 8, completion_tokens: 2 },
        });
      }),
    );
    const r = await proveedorIa("ia_openai", "k").conversar("m", {
      mensajes: [{ rol: "usuario", texto: "cuenta" }],
      salidaEstructurada: { nombre: "conteo", esquema: { type: "object" } },
    });
    expect(JSON.parse(body).response_format.type).toBe("json_schema");
    expect(r.texto).toBe('{"n":3}');
    expect(r.uso).toEqual({ tokensEntrada: 8, tokensSalida: 2 });
  });

  it("OpenAI: el stream arma la llamada de herramienta por trozos", async () => {
    const trozo1 = { index: 0, id: "c1", function: { name: "sum", arguments: '{"a":' } };
    const trozo2 = { index: 0, function: { arguments: "2}" } };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sse([
          { choices: [{ delta: { tool_calls: [trozo1] } }] },
          { choices: [{ delta: { tool_calls: [trozo2] } }] },
          { choices: [{ delta: {}, finish_reason: "tool_calls" }], usage: { prompt_tokens: 4, completion_tokens: 6 } },
        ]),
      ),
    );
    const eventos = await recolectar(
      proveedorIa("ia_xai", "k", { baseUrl: "https://api.x.ai/v1" }).conversarStream("m", {
        mensajes: [{ rol: "usuario", texto: "x" }],
      }),
    );
    const llamada = eventos.find((e) => e.tipo === "herramienta");
    expect(llamada?.tipo === "herramienta" && llamada.llamada).toEqual({ id: "c1", nombre: "sum", argumentos: { a: 2 } });
    const fin = eventos.at(-1);
    expect(fin?.tipo === "fin" && fin.respuesta.proveedor).toBe("ia_xai");
  });

  it("Anthropic: salida estructurada fuerza una herramienta y deja el JSON en texto", async () => {
    let body = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        body = String(init.body);
        return Response.json({
          content: [{ type: "tool_use", id: "s", name: "salida", input: { ok: true } }],
          usage: { input_tokens: 5, output_tokens: 3 },
          stop_reason: "tool_use",
        });
      }),
    );
    const r = await proveedorIa("ia_anthropic", "k").conversar("m", {
      mensajes: [{ rol: "usuario", texto: "x" }],
      salidaEstructurada: { nombre: "salida", esquema: { type: "object" } },
    });
    expect(JSON.parse(body).tool_choice).toEqual({ type: "tool", name: "salida" });
    expect(r.texto).toBe('{"ok":true}');
    expect(r.llamadas).toEqual([]);
  });

  it("Google: generateContent con functionDeclarations devuelve la llamada", async () => {
    let body = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        body = String(init.body);
        return Response.json({
          candidates: [{ content: { parts: [{ functionCall: { name: "ver", args: { id: 1 } } }] }, finishReason: "STOP" }],
          usageMetadata: { promptTokenCount: 6, candidatesTokenCount: 2 },
        });
      }),
    );
    const r = await proveedorIa("ia_google", "k").conversar("gemini", {
      mensajes: [{ rol: "usuario", texto: "x" }],
      herramientas: [{ nombre: "ver", descripcion: "Ver algo.", esquema: { type: "object" } }],
    });
    expect(JSON.parse(body).tools[0].functionDeclarations[0].name).toBe("ver");
    expect(r.llamadas).toEqual([{ id: "call_0", nombre: "ver", argumentos: { id: 1 } }]);
  });

  it("Anthropic: un evento de error en el stream lanza ErrorIa", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sse([
          { type: "message_start", message: { usage: { input_tokens: 3 } } },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "ho" } },
          { type: "error", error: { type: "overloaded_error", message: "x" } },
        ]),
      ),
    );
    const e = await recolectar(
      proveedorIa("ia_anthropic", "k").conversarStream("m", { mensajes: [{ rol: "usuario", texto: "x" }] }),
    ).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErrorIa);
  });

  it("un stream cortado (sin evento final) lanza ErrorIa en cada proveedor", async () => {
    const casos: { id: Parameters<typeof proveedorIa>[0]; eventos: unknown[]; opts?: { baseUrl: string } }[] = [
      { id: "ia_anthropic", eventos: [{ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "ho" } }] },
      { id: "ia_openai", eventos: [{ choices: [{ delta: { content: "ho" } }] }] },
      { id: "ia_google", eventos: [{ candidates: [{ content: { parts: [{ text: "ho" }] } }] }] },
      { id: "ia_xai", eventos: [{ choices: [{ delta: { content: "ho" } }] }], opts: { baseUrl: "https://api.x.ai/v1" } },
    ];
    for (const caso of casos) {
      vi.stubGlobal("fetch", vi.fn(async () => sse(caso.eventos)));
      const e = await recolectar(
        proveedorIa(caso.id, "k", caso.opts).conversarStream("m", { mensajes: [{ rol: "usuario", texto: "x" }] }),
      ).catch((x: unknown) => x);
      expect(e, caso.id).toBeInstanceOf(ErrorIa);
      vi.unstubAllGlobals();
    }
  });

  it("un 429 es reintentable y un 400 no; el error nunca incluye la key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("rate", { status: 429 })),
    );
    const e429 = await proveedorIa("ia_openai", "sk-secreta")
      .conversar("m", { mensajes: [{ rol: "usuario", texto: "x" }] })
      .catch((e: unknown) => e);
    expect(e429).toBeInstanceOf(ErrorIa);
    expect((e429 as ErrorIa).reintentable).toBe(true);
    expect(String((e429 as ErrorIa).message)).not.toContain("sk-secreta");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad", { status: 400 })),
    );
    const e400 = await proveedorIa("ia_openai", "k")
      .conversar("m", { mensajes: [{ rol: "usuario", texto: "x" }] })
      .catch((e: unknown) => e);
    expect((e400 as ErrorIa).reintentable).toBe(false);
  });
});

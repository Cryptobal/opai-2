import { afterEach, describe, expect, it, vi } from "vitest";

import { proveedorIa } from "./proveedores";

describe("proveedores de IA por HTTP", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("Anthropic: envía la key en cabecera y devuelve texto y tokens", async () => {
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      expect((init.headers as Record<string, string>)["x-api-key"]).toBe("sk-ant");
      return Response.json({
        content: [{ type: "text", text: "hola" }],
        usage: { input_tokens: 12, output_tokens: 3 },
      });
    });
    vi.stubGlobal("fetch", f);
    const r = await proveedorIa("ia_anthropic", "sk-ant").completar("claude-haiku-5-5", {
      prompt: "di hola",
    });
    expect(r).toEqual({
      texto: "hola",
      tokensEntrada: 12,
      tokensSalida: 3,
      modelo: "claude-haiku-5-5",
      proveedor: "ia_anthropic",
    });
  });

  it("OpenAI y Google normalizan su respuesta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          choices: [{ message: { content: "ok" } }],
          usage: { prompt_tokens: 5, completion_tokens: 1 },
        }),
      ),
    );
    expect(await proveedorIa("ia_openai", "k").completar("m", { prompt: "x" })).toMatchObject({
      texto: "ok",
      tokensEntrada: 5,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          candidates: [{ content: { parts: [{ text: "sí" }] } }],
          usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 1 },
        }),
      ),
    );
    expect(await proveedorIa("ia_google", "k").completar("m", { prompt: "x" })).toMatchObject({
      texto: "sí",
      tokensSalida: 1,
    });
  });

  it("un error HTTP se informa sin filtrar la key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 401 })),
    );
    await expect(
      proveedorIa("ia_anthropic", "sk-secreta").completar("m", { prompt: "x" }),
    ).rejects.toThrow(/^Anthropic respondió 401\.$/);
  });
});

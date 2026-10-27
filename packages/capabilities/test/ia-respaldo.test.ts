import { randomBytes } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorIa } from "@opai/integrations";

import {
  capacidadesDelNucleo,
  executeCapability,
  iaDe,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba } from "../src/testing";

beforeAll(() => {
  process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
});
beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});
afterEach(() => vi.unstubAllGlobals());

/** Conecta dos IA (BYOK): Anthropic (económica por defecto) y OpenAI con su modelo. */
async function conectarDos(ctx: ReturnType<typeof contextoDePrueba>["ctx"]) {
  await executeCapability(ctx, "core.integraciones.configurar", {
    proveedor: "ia_anthropic",
    modalidad: "propia",
  });
  await executeCapability(ctx, "core.integraciones.set_secreto", {
    proveedor: "ia_anthropic",
    nombre: "api_key",
    valor: "sk-ant-propia-0001",
  });
  await executeCapability(ctx, "core.integraciones.configurar", {
    proveedor: "ia_openai",
    modalidad: "propia",
    config: { modelos: { economica: "gpt-mini" } },
  });
  await executeCapability(ctx, "core.integraciones.set_secreto", {
    proveedor: "ia_openai",
    nombre: "api_key",
    valor: "sk-openai-propia-0002",
  });
}

const respuestaOpenai = () =>
  Response.json({
    choices: [{ message: { content: "desde openai" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 3, completion_tokens: 2 },
  });

describe("respaldo entre proveedores de IA (ADR-049)", () => {
  it("un 429 de Anthropic cae a OpenAI y mide el proveedor que respondió", async () => {
    const { ctx, usos } = contextoDePrueba();
    await conectarDos(ctx);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) =>
        u.includes("anthropic") ? new Response("rate", { status: 429 }) : respuestaOpenai(),
      ),
    );
    const ia = await iaDe(ctx, "economica");
    const r = await ia?.conversar({ mensajes: [{ rol: "usuario", texto: "hola" }] });
    expect(r?.proveedor).toBe("ia_openai");
    expect(r?.texto).toBe("desde openai");
    expect(usos.filter((c) => c.recurso.startsWith("ia."))).toMatchObject([
      { recurso: "ia.economica.entrada", cantidad: 3, sinCosto: true, referenciaId: "ia_openai:gpt-mini" },
      { recurso: "ia.economica.salida", cantidad: 2, sinCosto: true, referenciaId: "ia_openai:gpt-mini" },
    ]);
  });

  it("un 400 de contenido no cae al siguiente proveedor", async () => {
    const { ctx } = contextoDePrueba();
    await conectarDos(ctx);
    const f = vi.fn(async (u: string) =>
      u.includes("anthropic") ? new Response("bad", { status: 400 }) : respuestaOpenai(),
    );
    vi.stubGlobal("fetch", f);
    const ia = await iaDe(ctx, "economica");
    const e = await ia?.conversar({ mensajes: [{ rol: "usuario", texto: "hola" }] }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErrorIa);
    expect((e as ErrorIa).estado).toBe(400);
    // Solo se llamó a Anthropic: no hubo respaldo ante un 4xx de contenido.
    expect(f.mock.calls.every((c) => String(c[0]).includes("anthropic"))).toBe(true);
  });

  it("probar un proveedor concreto no usa respaldo", async () => {
    const { ctx } = contextoDePrueba();
    await conectarDos(ctx);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("rate", { status: 429 })),
    );
    const ia = await iaDe(ctx, "economica", "core", "ia_openai");
    const e = await ia?.completar({ prompt: "x" }).catch((x: unknown) => x);
    expect((e as ErrorIa).estado).toBe(429);
    expect(ia?.proveedor).toBe("ia_openai");
  });
});

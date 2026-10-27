import { randomBytes } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorIa } from "@opai/integrations";

import {
  capacidadesDelNucleo,
  ErrorRespaldoIa,
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
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Conecta una IA propia (BYOK) del tenant con su modelo económico. */
async function conectarPropia(
  ctx: ReturnType<typeof contextoDePrueba>["ctx"],
  proveedor: string,
  modelo: string,
) {
  await executeCapability(ctx, "core.integraciones.configurar", {
    proveedor,
    modalidad: "propia",
    config: { modelos: { economica: modelo } },
  });
  await executeCapability(ctx, "core.integraciones.set_secreto", {
    proveedor,
    nombre: "api_key",
    valor: `sk-${proveedor}-propia`,
  });
}

const respuestaAnthropic = () =>
  Response.json({
    content: [{ type: "text", text: "desde anthropic" }],
    usage: { input_tokens: 4, output_tokens: 6 },
    stop_reason: "end_turn",
  });

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

// Decisión de Carlos, 26-oct-2026 21:58 CLT, respuesta t214s684, a «Si el tenant tiene key propia y
// su proveedor falla, ¿se puede pasar a la key de OPAI?»: «Nunca, que falle y avise al tenant».
describe("política de respaldo con key propia (Carlos 26-oct-2026 21:58 CLT, t214s684)", () => {
  it("(a) única key propia que falla: falla, no usa la de OPAI y avisa al tenant", async () => {
    const { ctx, eventos, tabla } = contextoDePrueba();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-opai-plataforma"); // la key de OPAI existe en el entorno…
    await conectarPropia(ctx, "ia_openai", "gpt-mini");
    const f = vi.fn(async (_u: string) => new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", f);
    const ia = await iaDe(ctx, "economica");
    const e = await ia
      ?.conversar({ mensajes: [{ rol: "usuario", texto: "hola" }] })
      .catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErrorRespaldoIa);
    expect((e as ErrorRespaldoIa).proveedores).toEqual(["ia_openai"]);
    // …pero nunca se la usa: ninguna llamada fue a Anthropic (plataforma = OPAI).
    expect(f.mock.calls.some((c) => String(c[0]).includes("anthropic"))).toBe(false);
    // Aviso visible en el tenant: integración en error + core.integracion.error (Comunicaciones).
    expect(tabla("integracion").find((i) => i["proveedor"] === "ia_openai")?.["estado"]).toBe(
      "error",
    );
    expect(
      tabla("evento").filter((x) => x["tipo"] === "core.integracion.error"),
    ).toHaveLength(1);
    // Y un registro de auditoría durable del respaldo agotado.
    expect(eventos.map((x) => x.capability)).toContain("core.ia.respaldo_agotado");
  });

  it("(b) dos keys propias: cae a la segunda propia, nunca a la de OPAI", async () => {
    const { ctx } = contextoDePrueba();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-opai-plataforma");
    await conectarPropia(ctx, "ia_openai", "gpt-mini"); // primera (falla)
    await conectarPropia(ctx, "ia_xai", "grok-mini"); // segunda propia (responde)
    const f = vi.fn(async (u: string) =>
      String(u).includes("x.ai") ? respuestaOpenai() : new Response("boom", { status: 500 }),
    );
    vi.stubGlobal("fetch", f);
    const ia = await iaDe(ctx, "economica");
    const r = await ia?.conversar({ mensajes: [{ rol: "usuario", texto: "hola" }] });
    expect(r?.proveedor).toBe("ia_xai");
    expect(f.mock.calls.some((c) => String(c[0]).includes("anthropic"))).toBe(false);
  });

  it("(c) tenant sin key propia: usa el modelo de OPAI como hasta ahora", async () => {
    const { ctx, usos } = contextoDePrueba();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-opai-plataforma");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respuestaAnthropic()),
    );
    const ia = await iaDe(ctx, "economica");
    const r = await ia?.conversar({ mensajes: [{ rol: "usuario", texto: "hola" }] });
    expect(r?.proveedor).toBe("ia_anthropic");
    // Se cobra (no es BYOK): la medición no va sin costo.
    const filas = usos.filter((c) => c.recurso.startsWith("ia."));
    expect(filas.length).toBeGreaterThan(0);
    expect(filas.every((c) => c.sinCosto === false)).toBe(true);
  });
});

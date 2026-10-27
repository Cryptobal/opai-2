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

  it("(d) key propia sin modelo para la clase: falla, no usa OPAI y avisa (antes del filtro de modelo)", async () => {
    const { ctx, eventos, tabla } = contextoDePrueba();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-opai-plataforma"); // OPAI tiene modelo por defecto…
    // OpenAI propia con secreto pero SIN modelo configurado (MODELOS_POR_DEFECTO no trae OpenAI).
    await executeCapability(ctx, "core.integraciones.configurar", {
      proveedor: "ia_openai",
      modalidad: "propia",
    });
    await executeCapability(ctx, "core.integraciones.set_secreto", {
      proveedor: "ia_openai",
      nombre: "api_key",
      valor: "sk-openai-sin-modelo",
    });
    const f = vi.fn(async () => respuestaAnthropic());
    vi.stubGlobal("fetch", f);
    // …pero la decisión BYOK es ANTES del filtro de modelo: no se resuelve a Anthropic (OPAI).
    const e = await iaDe(ctx, "economica").catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErrorRespaldoIa);
    expect((e as ErrorRespaldoIa).proveedores).toEqual(["ia_openai"]);
    expect(f).not.toHaveBeenCalled();
    expect(tabla("integracion").find((i) => i["proveedor"] === "ia_openai")?.["estado"]).toBe(
      "error",
    );
    expect(tabla("evento").filter((x) => x["tipo"] === "core.integracion.error")).toHaveLength(1);
    expect(eventos.map((x) => x.capability)).toContain("core.ia.respaldo_agotado");
  });

  it("(e) key propia sin secreto guardado: falla, no usa OPAI y avisa", async () => {
    const { ctx, tabla } = contextoDePrueba();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-opai-plataforma");
    // Propia con modelo pero sin `set_secreto`: no hay credencial para llamar.
    await executeCapability(ctx, "core.integraciones.configurar", {
      proveedor: "ia_openai",
      modalidad: "propia",
      config: { modelos: { economica: "gpt-mini" } },
    });
    const f = vi.fn(async () => respuestaAnthropic());
    vi.stubGlobal("fetch", f);
    const e = await iaDe(ctx, "economica").catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErrorRespaldoIa);
    expect((e as ErrorRespaldoIa).proveedores).toEqual(["ia_openai"]);
    expect(f).not.toHaveBeenCalled(); // nunca se usa Anthropic (OPAI)
    expect(tabla("integracion").find((i) => i["proveedor"] === "ia_openai")?.["estado"]).toBe(
      "error",
    );
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

/** `Response` con un cuerpo SSE a partir de eventos JSON (como los emite Anthropic). */
const sse = (eventos: unknown[]) =>
  new Response(eventos.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""), {
    headers: { "content-type": "text/event-stream" },
  });

describe("medición del stream de IA: el uso parcial se registra en corte y cancelación (ADR-049)", () => {
  const conectarAnthropic = (ctx: ReturnType<typeof contextoDePrueba>["ctx"]) =>
    conectarPropia(ctx, "ia_anthropic", "claude-eco");
  const iaDeUso = (usos: ReturnType<typeof contextoDePrueba>["usos"]) =>
    usos.filter((c) => c.recurso.startsWith("ia."));

  it("stream completo: mide una sola vez el uso total, sin contarlo dos veces", async () => {
    const { ctx, usos } = contextoDePrueba();
    await conectarAnthropic(ctx);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sse([
          { type: "message_start", message: { usage: { input_tokens: 7 } } },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "ho" } },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "la" } },
          { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 5 } },
          { type: "message_stop" },
        ]),
      ),
    );
    const ia = await iaDe(ctx, "economica");
    let texto = "";
    for await (const ev of ia!.conversarStream({ mensajes: [{ rol: "usuario", texto: "x" }] }))
      if (ev.tipo === "texto") texto += ev.delta;
    expect(texto).toBe("hola");
    // Exactamente dos filas (entrada y salida), con el total final; no se duplica por el `uso` parcial.
    expect(iaDeUso(usos)).toMatchObject([
      { recurso: "ia.economica.entrada", cantidad: 7 },
      { recurso: "ia.economica.salida", cantidad: 5 },
    ]);
  });

  it("stream cortado (sin evento final): mide el uso parcial ya informado, no 0", async () => {
    const { ctx, usos } = contextoDePrueba();
    await conectarAnthropic(ctx);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sse([
          { type: "message_start", message: { usage: { input_tokens: 7 } } },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "ho" } },
          // sin message_delta ni message_stop: el adaptador lanza "stream incompleto".
        ]),
      ),
    );
    const ia = await iaDe(ctx, "economica");
    const e = await (async () => {
      try {
        for await (const _ of ia!.conversarStream({ mensajes: [{ rol: "usuario", texto: "x" }] }));
        return null;
      } catch (x: unknown) {
        return x;
      }
    })();
    expect(e).toBeInstanceOf(ErrorIa);
    // La entrada ya la informó Anthropic en message_start: se mide 7 (no 0).
    const filas = iaDeUso(usos);
    expect(filas.find((c) => c.recurso === "ia.economica.entrada")?.cantidad).toBe(7);
  });

  it("stream cancelado por el consumidor (break): mide el uso parcial conocido", async () => {
    const { ctx, usos } = contextoDePrueba();
    await conectarAnthropic(ctx);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sse([
          { type: "message_start", message: { usage: { input_tokens: 7 } } },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "ho" } },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "la" } },
          { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 5 } },
          { type: "message_stop" },
        ]),
      ),
    );
    const ia = await iaDe(ctx, "economica");
    for await (const ev of ia!.conversarStream({ mensajes: [{ rol: "usuario", texto: "x" }] }))
      if (ev.tipo === "texto") break; // el consumidor cancela tras el primer texto
    // El `finally` del stream midió el parcial ya conocido (entrada informada en message_start).
    const filas = iaDeUso(usos);
    expect(filas.find((c) => c.recurso === "ia.economica.entrada")?.cantidad).toBe(7);
  });

  it("stream OpenAI-compatible cortado: también mide el uso parcial ya informado", async () => {
    const { ctx, usos } = contextoDePrueba();
    await conectarPropia(ctx, "ia_openai", "gpt-mini");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sse([
          { choices: [{ delta: { content: "ho" } }], usage: { prompt_tokens: 3, completion_tokens: 0 } },
          { choices: [{ delta: { content: "la" } }] },
          // sin finish_reason: el adaptador lanza "stream incompleto".
        ]),
      ),
    );
    const ia = await iaDe(ctx, "economica");
    const e = await (async () => {
      try {
        for await (const _ of ia!.conversarStream({ mensajes: [{ rol: "usuario", texto: "x" }] }));
        return null;
      } catch (x: unknown) {
        return x;
      }
    })();
    expect(e).toBeInstanceOf(ErrorIa);
    const filas = iaDeUso(usos);
    expect(filas.find((c) => c.recurso === "ia.economica.entrada")?.cantidad).toBe(3);
  });
});

import { randomBytes } from "node:crypto";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";

import { capacidadesDelNucleo, ErrorRespaldoIa, executeCapability, iaDe, limpiarRegistro, registrarCapacidades } from "../src";
import { iaElegidaDelAgente } from "../src/integraciones/ia-modelos";
import { contextoDePrueba } from "../src/testing";

beforeAll(() => { process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64"); });
beforeEach(() => { limpiarRegistro(); registrarCapacidades(capacidadesDelNucleo); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("el agente avisa si falla su proveedor propio y nunca llama a OPAI", async () => {
  const { ctx, tabla, eventos } = contextoDePrueba();
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-opai-plataforma");
  await executeCapability(ctx, "core.integraciones.configurar", {
    proveedor: "ia_openai", modalidad: "propia", config: { modelos: { economica: "gpt-mini" } },
  });
  await executeCapability(ctx, "core.integraciones.set_secreto", {
    proveedor: "ia_openai", nombre: "api_key", valor: "sk-openai-propia",
  });
  const fetch = vi.fn(async (_url: string) => new Response("fallo", { status: 500 }));
  vi.stubGlobal("fetch", fetch);
  const ia = await iaElegidaDelAgente(ctx, { proveedor: "ia_openai", modelo: "gpt-mini", clase: "economica" });
  await expect(ia.conversar({ mensajes: [{ rol: "usuario", texto: "hola" }] })).rejects.toBeInstanceOf(ErrorRespaldoIa);
  expect(fetch).toHaveBeenCalled();
  expect(fetch.mock.calls.every(([url]) => !String(url).includes("anthropic"))).toBe(true);
  expect(tabla("integracion").find((i) => i["proveedor"] === "ia_openai")?.["estado"]).toBe("error");
  expect(tabla("evento").filter((e) => e["tipo"] === "core.integracion.error")).toHaveLength(1);
  expect(eventos.map((e) => e.capability)).toContain("core.ia.respaldo_agotado");
});

it("solo rechaza una propia inservible y no selecciona plataforma con otra propia", async () => {
  const { ctx, tabla, eventos } = contextoDePrueba();
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-opai-plataforma");
  await executeCapability(ctx, "core.integraciones.configurar", {
    proveedor: "ia_openai", modalidad: "propia", config: { modelos: { economica: "gpt-mini" } },
  });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(iaDe(ctx, "economica", "agente", "ia_openai")).rejects.toBeInstanceOf(ErrorRespaldoIa);
  await expect(iaDe(ctx, "economica", "agente", "ia_anthropic")).rejects.toBeInstanceOf(ErrorRespaldoIa);
  expect(fetch).not.toHaveBeenCalled();
  expect(tabla("integracion").find((i) => i["proveedor"] === "ia_openai")?.["estado"]).toBe("error");
  expect(tabla("evento").filter((e) => e["tipo"] === "core.integracion.error")).toHaveLength(1);
  expect(eventos.map((e) => e.capability)).toContain("core.ia.respaldo_agotado");
});

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Contexto } from "@opai/capabilities";
import type * as Capacidades from "@opai/capabilities";

const { conversar, elegir } = vi.hoisted(() => ({ conversar: vi.fn(), elegir: vi.fn() }));
vi.mock("@opai/capabilities", async (original) => {
  const a = await original<typeof Capacidades>();
  return {
    ...a,
    iaElegidaDelAgente: elegir,
    comoAgenteInterno: (ctx: Contexto) => ({
      ...a.comoAgenteInterno(ctx),
      medidor: ctx.medidor,
      eventos: ctx.eventos,
    }),
  };
});

import { executeCapability, limpiarRegistro, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { ErrorIa } from "@opai/integrations";
import { turnoPreparar } from "./capacidades";

const entrada = {
  mensaje: "Hola, prueba sintética",
  modelo: { proveedor: "ia_anthropic", modelo: "simulado", clase: "economica" },
  nivel: "paso_a_paso",
};

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades([turnoPreparar]);
  conversar.mockReset();
  elegir.mockReset().mockResolvedValue({ conversar });
  vi.stubEnv("BETTER_AUTH_SECRET", "fixture-local-sin-credenciales-0000000000");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Red no permitida en esta prueba");
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it.each([400, 401, 429])("el turno entrega un error accionable para HTTP %i", async (estado) => {
  const { ctx, tabla } = contextoDePrueba({ modulosActivos: ["agente"] });
  ctx.revalidarAccesoSolicitud = async () => "acceso-ficticio";
  conversar.mockRejectedValue(new ErrorIa("privado", estado, "cuerpo privado: token simulado"));
  const r = await executeCapability(ctx, "agente.turno.preparar", entrada);
  expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  expect(JSON.stringify(r)).not.toMatch(/privado|token simulado|ref:/);
  expect(conversar).toHaveBeenCalledOnce();
  expect(tabla("agenteConversacion")).toHaveLength(0);
  expect(fetch).not.toHaveBeenCalled();
});

it("también clasifica un error tipado al resolver el proveedor", async () => {
  const { ctx } = contextoDePrueba({ modulosActivos: ["agente"] });
  ctx.revalidarAccesoSolicitud = async () => "acceso-ficticio";
  elegir.mockRejectedValue(new ErrorIa("privado", 401, "cuerpo privado"));
  expect(await executeCapability(ctx, "agente.turno.preparar", entrada)).toMatchObject({
    ok: false,
    error: { code: "UNPROCESSABLE", message: expect.stringContaining("credencial") },
  });
  expect(conversar).not.toHaveBeenCalled();
});

it("sin permiso y en dryRun no resuelve ni llama a IA", async () => {
  const denegado = contextoDePrueba({ modulosActivos: ["agente"], permisos: [] });
  expect(await executeCapability(denegado.ctx, "agente.turno.preparar", entrada)).toMatchObject({
    ok: false,
  });
  const { ctx } = contextoDePrueba({ modulosActivos: ["agente"] });
  expect(
    await executeCapability(ctx, "agente.turno.preparar", entrada, { dryRun: true }),
  ).toMatchObject({ ok: true });
  expect(elegir).not.toHaveBeenCalled();
  expect(conversar).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

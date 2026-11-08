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
import {
  executeCapability,
  limpiarRegistro,
  limpiarModulos,
  prohibido,
  registrarModulos,
} from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { turnoPreparar } from "./capacidades";
import { entornoBucle, llamada, respuesta } from "./bucle-fixtures";
import { prepararTurno } from "./bucle";
import { manifest } from "./manifest";

const entrada = {
  mensaje: "Solicitud ficticia",
  modelo: { proveedor: "ia_anthropic", modelo: "simulado", clase: "economica" },
  nivel: "paso_a_paso",
};
const entorno = () => {
  const e = contextoDePrueba({ modulosActivos: ["agente"] });
  e.ctx.revalidarAccesoSolicitud = vi.fn(async () => "huella-ficticia");
  e.ctx.revalidarAccesoEnTransaccion = vi.fn(async () => "huella-ficticia");
  return e;
};
beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarModulos([manifest]);
  conversar.mockReset().mockResolvedValue(respuesta());
  elegir.mockReset().mockResolvedValue({ conversar });
  vi.stubEnv("BETTER_AUTH_SECRET", "fixture-local-sin-credenciales-0000000000");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("HTTP prohibido");
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("llama IA antes de abrir la transacción de guardado y audita una sola vez", async () => {
  const e = entorno();
  const transaccion = e.ctx.transaccion;
  let dentro = false;
  e.ctx.transaccion = async (fn) =>
    transaccion(async (tx) => {
      dentro = true;
      try {
        return await fn(tx);
      } finally {
        dentro = false;
      }
    });
  conversar.mockImplementation(async () => {
    expect(dentro).toBe(false);
    return respuesta();
  });
  e.ctx.revalidarAccesoSolicitud = async () => {
    expect(dentro).toBe(false);
    return "huella-ficticia";
  };
  e.ctx.revalidarAccesoEnTransaccion = async (tx) => {
    expect(dentro).toBe(true);
    expect(tx).toBeDefined();
    return "huella-ficticia";
  };
  const resultado = await executeCapability(e.ctx, turnoPreparar.id, entrada);
  expect(resultado, JSON.stringify(resultado)).toMatchObject({ ok: true });
  expect(e.tabla("agenteConversacion")).toHaveLength(1);
  expect(e.eventos.filter((x) => x.capability === turnoPreparar.id)).toHaveLength(1);
  expect(fetch).not.toHaveBeenCalled();
});

it("falla cerrado sin revalidación del borde, pero dryRun no incurre en IA", async () => {
  const e = contextoDePrueba({ modulosActivos: ["agente"] });
  expect(await executeCapability(e.ctx, turnoPreparar.id, entrada)).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
  expect(await executeCapability(e.ctx, turnoPreparar.id, entrada, { dryRun: true })).toMatchObject(
    { ok: true, data: { accesoSolicitud: null } },
  );
  expect(elegir).not.toHaveBeenCalled();
});

it("rechaza revocación durante IA sin guardar ni devolver respuesta", async () => {
  const e = entorno();
  let vigente = true;
  e.ctx.revalidarAccesoSolicitud = async () => {
    if (!vigente) throw prohibido("Revocado");
    return "huella";
  };
  conversar.mockImplementation(async () => {
    vigente = false;
    return respuesta();
  });
  expect(await executeCapability(e.ctx, turnoPreparar.id, entrada)).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
  expect(e.tabla("agenteConversacion")).toHaveLength(0);
});

it("sin callback transaccional deniega antes de resolver proveedor o cobrar IA", async () => {
  const e = entorno();
  delete e.ctx.revalidarAccesoEnTransaccion;
  expect(await executeCapability(e.ctx, turnoPreparar.id, entrada)).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
  expect(elegir).not.toHaveBeenCalled();
  expect(conversar).not.toHaveBeenCalled();
  expect(e.tabla("agenteConversacion")).toHaveLength(0);
});

it("repite éxito sin otra llamada y rechaza caché producida bajo otro acceso", async () => {
  const e = entorno();
  const opciones = { idempotencyKey: "turno-ficticio" };
  const primera = await executeCapability(e.ctx, turnoPreparar.id, entrada, opciones);
  expect(primera, JSON.stringify(primera)).toMatchObject({ ok: true });
  expect(await executeCapability(e.ctx, turnoPreparar.id, entrada, opciones)).toEqual({
    ...primera,
    repetida: true,
  });
  e.ctx.revalidarAccesoSolicitud = async () => "otro-acceso-vigente";
  expect(await executeCapability(e.ctx, turnoPreparar.id, entrada, opciones)).toMatchObject({
    ok: false,
    error: { code: "FORBIDDEN" },
  });
  expect(conversar).toHaveBeenCalledOnce();
  expect(e.tabla("agenteConversacion")).toHaveLength(1);
});

it("no ejecuta herramientas después de revocación durante una respuesta IA", async () => {
  const e = entornoBucle("lectura");
  let vigente = true;
  e.ctx.revalidarAccesoSolicitud = async () => {
    if (!vigente) throw prohibido("Revocado");
    return "huella";
  };
  const ia = {
    conversar: vi.fn(async () => {
      vigente = false;
      return respuesta([llamada]);
    }),
  };
  await expect(prepararTurno(e.ctx, "Lectura ficticia", ia)).rejects.toThrow("Revocado");
  expect(ia.conversar).toHaveBeenCalledOnce();
  expect(e.usos.filter((x) => x.capability === "core.prueba.accion")).toHaveLength(0);
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { limpiarRegistro } from "@opai/capabilities";

import { ejecutarPaso, prepararTurno, type Conversador } from "./bucle";
import { entornoBucle, llamada, respuesta } from "./bucle-fixtures";

beforeEach(() => limpiarRegistro());

const proveedor = () => ({
  conversar: vi
    .fn<Conversador["conversar"]>()
    .mockResolvedValueOnce(respuesta([llamada]))
    .mockResolvedValue(respuesta()),
});

describe("bucle servidor del agente interno", () => {
  it("ejecuta lecturas por el registro y entrega al modelo un resultado marcado como externo", async () => {
    const e = entornoBucle("lectura");
    const ia = proveedor();
    const plan = await prepararTurno(e.ctx, "Consulta la prueba", ia);
    expect(plan.pasos).toHaveLength(0);
    expect(e.escrituras()).toBe(0);
    const mensajes = ia.conversar.mock.calls[1]![0].mensajes;
    const ultimo = mensajes.find((m) => m.rol === "herramienta");
    if (ultimo?.rol !== "herramienta") throw new Error("Falta el resultado de la herramienta.");
    expect(ultimo.resultado).toContain('"externo":true');
    expect(e.usos.some((u) => u.actorTipo === "agent" && u.apiKeyId === null)).toBe(true);
  });

  it("sin confirmación solo calcula dryRun; el paso confirmado usa su idempotencia", async () => {
    const e = entornoBucle("escritura");
    const plan = await prepararTurno(e.ctx, "Crea la prueba", proveedor());
    expect(e.escrituras()).toBe(0);
    expect(plan.pasos).toHaveLength(1);
    expect((await ejecutarPaso(e.ctx, plan.pasos[0]!)).ok).toBe(true);
    expect((await ejecutarPaso(e.ctx, plan.pasos[0]!)).ok).toBe(true);
    expect(e.escrituras()).toBe(1);
    expect(e.eventos[0]?.actor).toMatchObject({ tipo: "agent", viaUserId: e.ctx.usuario!.id });
  });

  it("la confirmación del plan no sustituye la aprobación humana de lo irreversible", async () => {
    const e = entornoBucle("irreversible");
    const plan = await prepararTurno(e.ctx, "Propón la acción", proveedor());
    expect(await ejecutarPaso(e.ctx, plan.pasos[0]!)).toMatchObject({
      ok: false,
      error: { code: "APPROVAL_REQUIRED" },
    });
    expect(e.escrituras()).toBe(0);
    expect(e.tabla("aprobacion")[0]).toMatchObject({
      apiKeyId: null,
      agenteInternoId: e.ctx.actor.id,
      viaUserId: e.ctx.usuario!.id,
    });
  });

  it("la inyección externa y una propuesta del modelo nunca equivalen a confirmación", async () => {
    const e = entornoBucle("irreversible");
    const plan = await prepararTurno(e.ctx, "Lee los datos externos", proveedor());
    expect(plan.pasos).toHaveLength(1);
    expect(e.escrituras()).toBe(0);
    expect(e.tabla("aprobacion")).toHaveLength(0);
  });

  it("acota un modelo que solicita herramientas indefinidamente", async () => {
    const e = entornoBucle("lectura");
    const ia = { conversar: vi.fn().mockResolvedValue(respuesta([llamada])) };
    await expect(prepararTurno(e.ctx, "Consulta", ia)).rejects.toThrow(/límite/);
    expect(ia.conversar.mock.calls.length).toBeLessThanOrEqual(12);
  });
});

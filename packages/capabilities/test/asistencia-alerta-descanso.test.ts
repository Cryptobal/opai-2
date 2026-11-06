// CAR-89 · seguimiento de A3: la alerta de descanso insuficiente se emite una vez, solo cuando corresponde.
import { describe, expect, it, vi } from "vitest";

import type { Contexto } from "../src";
import { alertarDescanso } from "../../../modules/asistencia/capabilities/alertas-descanso";
import type { DiaCalculado } from "../../../modules/asistencia/capabilities/dias-calculo";

const dia = (extra: Partial<DiaCalculado> = {}) =>
  ({ personaId: "p1", fecha: "2026-11-05", tipoJornada: "teletrabajo", descansoInsuficiente: true, entrada: new Date("2026-11-05T10:30:00Z"), instalacionId: null, turnoEsperadoId: null, ...extra }) as DiaCalculado;

function ctxFalso(creados: number) {
  const emitir = vi.fn(async () => undefined);
  const createMany = vi.fn(async () => ({ count: creados }));
  const ctx = {
    tenantId: "t1", eventos: { emitir },
    transaccion: async <T>(fn: (tx: unknown) => Promise<T>) => fn({ alerta: { createMany } }),
  } as unknown as Contexto;
  return { ctx, emitir, createMany };
}

describe("alertarDescanso", () => {
  it("teletrabajo con descanso insuficiente: crea la alerta y emite el evento una vez", async () => {
    const { ctx, emitir, createMany } = ctxFalso(1);
    expect(await alertarDescanso(ctx, dia(), "America/Santiago")).toBe(true);
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true, data: [expect.objectContaining({ tipo: "descanso_insuficiente", clave: "descanso:p1:2026-11-05" })] }));
    expect(emitir).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tipo: "asistencia.alerta.descanso_insuficiente", entidadId: "p1" }));
  });

  it("si la alerta ya existía (clave única) no repite el evento", async () => {
    const { ctx, emitir } = ctxFalso(0);
    expect(await alertarDescanso(ctx, dia(), "America/Santiago")).toBe(false);
    expect(emitir).not.toHaveBeenCalled();
  });

  it("sin descanso insuficiente, sin entrada o en una jornada sin mínimo, no alerta", async () => {
    for (const d of [dia({ descansoInsuficiente: false }), dia({ entrada: null }), dia({ tipoJornada: "ordinaria" })]) {
      const { ctx, createMany } = ctxFalso(1);
      expect(await alertarDescanso(ctx, d, "America/Santiago")).toBe(false);
      expect(createMany).not.toHaveBeenCalled();
    }
  });
});

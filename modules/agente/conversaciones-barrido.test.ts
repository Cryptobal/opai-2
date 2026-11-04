import { expect, it, vi } from "vitest";
import type { Contexto } from "@opai/capabilities";

import { trabajoConversacionesVencidas } from "./conversaciones-barrido";

const TENANT = "00000000-0000-4000-8000-0000000000aa";

function falso(lotes: string[][]) {
  const pendientes = [...lotes];
  const db = {
    agenteConversacion: {
      findMany: vi.fn(async () => (pendientes.shift() ?? []).map((id) => ({ id }))),
      deleteMany: vi.fn(async (a: { where: { id: { in: string[] } } }) => ({
        count: a.where.id.in.length,
      })),
    },
  };
  return { ctx: { tenantId: TENANT, db } as unknown as Contexto, db };
}

it("borra lo vencido de su empresa, con el plazo por defecto de 90 días", async () => {
  const { ctx, db } = falso([["a", "b"]]);
  const antes = Date.now();
  expect(await trabajoConversacionesVencidas.ejecutar(ctx, {})).toEqual({ borradas: 2 });
  const corte = (
    db.agenteConversacion.findMany.mock.calls[0] as unknown as [
      { where: { tenantId: string; ultimaActividad: { lt: Date } } },
    ]
  )[0].where;
  expect(corte.tenantId).toBe(TENANT);
  expect(antes - corte.ultimaActividad.lt.getTime()).toBeGreaterThanOrEqual(90 * 864e5 - 1000);
  // El borrado repite el plazo: lo que recibió un turno entre la lectura y el borrado se salva.
  expect(db.agenteConversacion.deleteMany).toHaveBeenCalledWith({
    where: {
      tenantId: TENANT,
      id: { in: ["a", "b"] },
      ultimaActividad: { lt: corte.ultimaActividad.lt },
    },
  });
});

it("sin vencidas no borra nada y es diario", async () => {
  const { ctx, db } = falso([]);
  expect(await trabajoConversacionesVencidas.ejecutar(ctx, {})).toEqual({ borradas: 0 });
  expect(db.agenteConversacion.deleteMany).not.toHaveBeenCalled();
  expect(trabajoConversacionesVencidas.periodicidad).toBe("diaria");
});

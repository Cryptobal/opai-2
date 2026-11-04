import { expect, it, vi } from "vitest";
import { ajuste, type Contexto } from "@opai/capabilities";

import { trabajoConversacionesVencidas } from "./conversaciones-barrido";

// El ajuste del módulo no está registrado en estos tests unitarios: se fija el defecto.
vi.mock("@opai/capabilities", async () => ({
  ...(await vi.importActual<Record<string, unknown>>("@opai/capabilities")),
  ajuste: vi.fn(async () => 90),
}));

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
  const registrar = vi.fn(async () => ({ seq: 1, hash: "h" }));
  const ctx = {
    tenantId: TENANT,
    actor: { tipo: "system" },
    db,
    transaccion: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
    auditoria: { registrar },
  } as unknown as Contexto;
  return { ctx, db, registrar };
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

it("si el ajuste de retención no se puede leer, falla y no borra nada", async () => {
  const { ctx, db } = falso([["a"]]);
  vi.mocked(ajuste).mockRejectedValueOnce(new Error("config caída"));
  await expect(trabajoConversacionesVencidas.ejecutar(ctx, {})).rejects.toThrow("config caída");
  expect(db.agenteConversacion.deleteMany).not.toHaveBeenCalled();
});

it("deja traza de la purga con el conteo, sin IDs ni contenido de conversaciones", async () => {
  const { ctx, registrar } = falso([["a", "b"]]);
  await trabajoConversacionesVencidas.ejecutar(ctx, {});
  expect(registrar).toHaveBeenCalledTimes(1);
  const [, evento] = registrar.mock.calls[0] as unknown as [unknown, { payload: unknown }];
  expect(evento).toMatchObject({
    tenantId: TENANT,
    capability: "agente.conversaciones.vencidas",
    payload: { borradas: 2, origen: "barrido" },
  });
  expect(JSON.stringify(evento)).not.toMatch(/"a"|"b"|mensajes|titulo/);
});

it("si no se borró nada no deja traza", async () => {
  const { ctx, db, registrar } = falso([["a"]]);
  db.agenteConversacion.deleteMany.mockResolvedValueOnce({ count: 0 });
  await trabajoConversacionesVencidas.ejecutar(ctx, {});
  expect(registrar).not.toHaveBeenCalled();
});

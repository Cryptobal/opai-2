import { expect, it, vi } from "vitest";
import type { Contexto } from "@opai/capabilities";

import { guardarTurno } from "./conversaciones-guardado";

const USUARIO = "00000000-0000-4000-8000-000000000001";
const TENANT = "00000000-0000-4000-8000-0000000000aa";

function falso(opciones: { servicio?: boolean; existente?: unknown } = {}) {
  const db = {
    agenteConversacion: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      findFirst: vi.fn(async () => opciones.existente ?? null),
      update: vi.fn(async (_a: { data: { mensajes: unknown[] } }) => ({})),
      create: vi.fn(async () => ({ id: "nueva" })),
    },
  };
  const ctx = {
    tenantId: TENANT,
    usuario: { id: USUARIO },
    principal: opciones.servicio ? { tipo: "servicio" } : null,
    db,
  } as unknown as Contexto;
  return { ctx, db };
}
const turno = { mensaje: "  Hola   OPAI  ", texto: "Hola", pasos: ["core.cargos.create"] };

it("un servicio no guarda ni hereda conversaciones", async () => {
  const { ctx, db } = falso({ servicio: true });
  expect(await guardarTurno(ctx, turno)).toBeNull();
  expect(db.agenteConversacion.create).not.toHaveBeenCalled();
});

it("crea la conversación propia con título limpio y purga las vencidas", async () => {
  const { ctx, db } = falso();
  expect(await guardarTurno(ctx, turno)).toBe("nueva");
  expect(db.agenteConversacion.deleteMany).toHaveBeenCalledWith({
    where: expect.objectContaining({ tenantId: TENANT, userId: USUARIO }),
  });
  expect(db.agenteConversacion.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ titulo: "Hola OPAI", userId: USUARIO, tenantId: TENANT }),
    }),
  );
});

it("retoma una conversación propia y agrega los dos mensajes; una ajena crea otra", async () => {
  const previo = [{ rol: "usuario", texto: "antes", fecha: "2026-11-01T00:00:00.000Z" }];
  const a = falso({ existente: { id: "c1", mensajes: previo } });
  expect(await guardarTurno(a.ctx, { ...turno, conversacionId: "c1" })).toBe("c1");
  expect(a.db.agenteConversacion.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ userId: USUARIO, tenantId: TENANT, id: "c1" }),
    }),
  );
  const data = a.db.agenteConversacion.update.mock.calls[0]?.[0];
  expect(data?.data.mensajes).toHaveLength(3);
  const b = falso();
  expect(await guardarTurno(b.ctx, { ...turno, conversacionId: "ajena" })).toBe("nueva");
});

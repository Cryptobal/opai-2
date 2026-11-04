import { expect, it, vi } from "vitest";
import type { Contexto } from "@opai/capabilities";

import { guardarTurno } from "./conversaciones-guardado";

const USUARIO = "00000000-0000-4000-8000-000000000001";
const TENANT = "00000000-0000-4000-8000-0000000000aa";
const TURNO = "00000000-0000-4000-8000-0000000000bb";

type Opciones = { servicio?: boolean; existente?: unknown[]; conteos?: number[] };

function falso(opciones: Opciones = {}) {
  // Cada lectura devuelve la siguiente fila; `conteos` simula lo que devuelve cada updateMany.
  const filas = [...(opciones.existente ?? [])];
  const conteos = [...(opciones.conteos ?? [1])];
  const db = {
    agenteConversacion: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      findFirst: vi.fn(async () => filas.shift() ?? null),
      updateMany: vi.fn(async (_a: { data: { mensajes: unknown[] } }) => ({
        count: conteos.shift() ?? 1,
      })),
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
const previo = [{ rol: "usuario", texto: "antes", fecha: "2026-11-01T00:00:00.000Z" }];

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

it("retoma una conversación propia con escritura condicional por versión; una ajena crea otra", async () => {
  const a = falso({ existente: [{ id: "c1", mensajes: previo, version: 3 }] });
  expect(await guardarTurno(a.ctx, { ...turno, conversacionId: "c1" })).toBe("c1");
  expect(a.db.agenteConversacion.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ userId: USUARIO, tenantId: TENANT, id: "c1" }),
    }),
  );
  const llamada = a.db.agenteConversacion.updateMany.mock.calls[0]?.[0];
  expect(llamada).toMatchObject({
    where: { id: "c1", version: 3 },
    data: { version: { increment: 1 } },
  });
  expect(llamada?.data.mensajes).toHaveLength(3);
  const b = falso();
  expect(await guardarTurno(b.ctx, { ...turno, conversacionId: "ajena" })).toBe("nueva");
});

it("dos pestañas: si la versión cambió, relee y suma ambos turnos sin pisar al otro", async () => {
  const otro = { rol: "agente", texto: "de la otra pestaña", fecha: "2026-11-02T00:00:00.000Z" };
  const a = falso({
    existente: [
      { id: "c1", mensajes: previo, version: 3 },
      { id: "c1", mensajes: [...previo, otro], version: 4 },
    ],
    conteos: [0, 1],
  });
  expect(await guardarTurno(a.ctx, { ...turno, conversacionId: "c1" })).toBe("c1");
  const llamadas = a.db.agenteConversacion.updateMany.mock.calls;
  expect(llamadas).toHaveLength(2);
  expect(llamadas[1]?.[0].data.mensajes).toHaveLength(4);
});

it("si pierde todas las carreras responde CONFLICT en vez de duplicar o pisar", async () => {
  const fila = { id: "c1", mensajes: previo, version: 1 };
  const a = falso({ existente: [fila, fila, fila, fila], conteos: [0, 0, 0, 0] });
  await expect(guardarTurno(a.ctx, { ...turno, conversacionId: "c1" })).rejects.toMatchObject({
    code: "CONFLICT",
  });
  expect(a.db.agenteConversacion.create).not.toHaveBeenCalled();
});

it("un reintento con el mismo turnoId no duplica los mensajes", async () => {
  const guardado = [...previo, { rol: "usuario", texto: "x", fecha: "f", turno: TURNO }];
  const a = falso({ existente: [{ id: "c1", mensajes: guardado, version: 5 }] });
  expect(await guardarTurno(a.ctx, { ...turno, conversacionId: "c1", turnoId: TURNO })).toBe("c1");
  expect(a.db.agenteConversacion.updateMany).not.toHaveBeenCalled();
});

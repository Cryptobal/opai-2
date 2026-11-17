import { describe, expect, it } from "vitest";

import { historialConversacionModelo } from "./conversaciones-historial-modelo";

const USER = "11111111-1111-1111-1111-111111111111";
const TENANT = "22222222-2222-2222-2222-222222222222";
const CONV = "33333333-3333-3333-3333-333333333333";

function ctx(mensajes: unknown) {
  return {
    tenantId: TENANT,
    usuario: { id: USER },
    principal: { tipo: "usuario" as const },
    db: {
      agenteConversacion: {
        findFirst: async () => ({ mensajes }),
      },
    },
  } as never;
}

describe("historial de conversación para el modelo (CAR-227)", () => {
  it("mapea mensajes guardados y omite un turno en curso por turnoId", async () => {
    const turno = "44444444-4444-4454-8444-444444444444";
    const historial = await historialConversacionModelo(
      ctx([
        { rol: "usuario", texto: "Hola", fecha: "2026-01-01T00:00:00Z" },
        { rol: "agente", texto: "¿En qué ayudo?", fecha: "2026-01-01T00:00:01Z" },
        { rol: "usuario", texto: "Reintento", fecha: "2026-01-01T00:00:02Z", turno },
        { rol: "agente", texto: "Borrar", fecha: "2026-01-01T00:00:03Z", turno },
      ]),
      CONV,
      turno,
    );
    expect(historial).toEqual([
      { rol: "usuario", texto: "Hola" },
      { rol: "asistente", texto: "¿En qué ayudo?" },
    ]);
  });

  it("sin conversación devuelve vacío", async () => {
    const historial = await historialConversacionModelo(
      {
        tenantId: TENANT,
        usuario: { id: USER },
        principal: { tipo: "usuario" },
        db: { agenteConversacion: { findFirst: async () => null } },
      } as never,
      CONV,
    );
    expect(historial).toEqual([]);
  });
});
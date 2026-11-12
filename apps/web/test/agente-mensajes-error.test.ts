import { describe, expect, it } from "vitest";

import { textoError } from "../app/_components/agente/mensajes-error";

describe("mensajes de error del agente (CAR-333)", () => {
  it("un acceso denegado muestra el motivo del servidor", () => {
    expect(
      textoError("FORBIDDEN", "Tu acceso cambió durante la solicitud. Vuelve a abrir el agente."),
    ).toBe(
      "Tu acceso cambió durante la solicitud. Vuelve a abrir el agente. No se hizo ningún cambio.",
    );
  });

  it("sin motivo o con el genérico de permisos, el texto de siempre", () => {
    const generico = "No tienes acceso para hacer eso con el agente. No se hizo ningún cambio.";
    expect(textoError("FORBIDDEN", "")).toBe(generico);
    expect(textoError("FORBIDDEN", "Sin permiso para esta capacidad.")).toBe(generico);
  });
});

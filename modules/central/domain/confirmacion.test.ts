import { describe, expect, it } from "vitest";

import {
  ANTICIPACION_DEFECTO,
  estadoPorRespuesta,
  puedeMarcarSinRespuesta,
  puedeResponder,
  PLAZO_RESPUESTA_DEFECTO,
} from "./confirmacion";

describe("confirmación de turno · dominio", () => {
  it("cada respuesta válida del guardia fija el estado", () => {
    expect(estadoPorRespuesta("confirmado", null)).toBe("confirmado");
    expect(estadoPorRespuesta("en_camino", null)).toBe("en_camino");
    expect(estadoPorRespuesta("con_problema", "Sin transporte")).toBe("con_problema");
  });

  it("«con_problema» exige motivo y rechaza uno vacío o largo", () => {
    expect(estadoPorRespuesta("con_problema", "")).toBeNull();
    expect(estadoPorRespuesta("con_problema", "   ")).toBeNull();
    expect(estadoPorRespuesta("con_problema", "x".repeat(201))).toBeNull();
  });

  it("solo pendiente pasa a sin respuesta; el guardia puede responder en cualquier estado", () => {
    expect(puedeMarcarSinRespuesta("pendiente")).toBe(true);
    expect(puedeMarcarSinRespuesta("confirmado")).toBe(false);
    for (const e of ["pendiente", "confirmado", "sin_respuesta"] as const) {
      expect(puedeResponder(e)).toBe(true);
    }
  });

  it("expone valores por defecto de la política", () => {
    expect(ANTICIPACION_DEFECTO).toBe(60);
    expect(PLAZO_RESPUESTA_DEFECTO).toBe(15);
  });
});
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

  it("solo pendiente pasa a sin respuesta", () => {
    expect(puedeMarcarSinRespuesta("pendiente")).toBe(true);
    expect(puedeMarcarSinRespuesta("confirmado")).toBe(false);
  });

  it("no admite respuesta tras sin respuesta o si el turno ya empezó", () => {
    const inicio = new Date("2026-06-01T08:00:00Z");
    const antes = new Date("2026-06-01T07:30:00Z");
    const despues = new Date("2026-06-01T08:30:00Z");
    expect(puedeResponder("pendiente", inicio, antes)).toBe(true);
    expect(puedeResponder("confirmado", inicio, antes)).toBe(true);
    expect(puedeResponder("en_camino", inicio, antes)).toBe(true);
    expect(puedeResponder("con_problema", inicio, antes)).toBe(true);
    expect(puedeResponder("pendiente", inicio, despues)).toBe(false);
    expect(puedeResponder("sin_respuesta", inicio, antes)).toBe(false);
  });

  it("expone valores por defecto de la política", () => {
    expect(ANTICIPACION_DEFECTO).toBe(60);
    expect(PLAZO_RESPUESTA_DEFECTO).toBe(15);
  });
});
// Contador de consultas por request (ADR-045): el observador que registra el borde recibe un aviso
// por cada operación de modelo y nunca puede romper una consulta. No necesita base de datos.
import { afterEach, describe, expect, it, vi } from "vitest";

import { notificarConsulta, registrarObservadorConsultas } from "../src/metricas";

afterEach(() => registrarObservadorConsultas(null));

describe("contador de consultas", () => {
  it("sin observador registrado, notificar no hace nada", () => {
    expect(() => notificarConsulta()).not.toThrow();
  });

  it("avisa al observador una vez por notificación", () => {
    const observador = vi.fn();
    registrarObservadorConsultas(observador);
    notificarConsulta();
    notificarConsulta();
    expect(observador).toHaveBeenCalledTimes(2);
  });

  it("quitar el observador (null) detiene los avisos", () => {
    const observador = vi.fn();
    registrarObservadorConsultas(observador);
    notificarConsulta();
    registrarObservadorConsultas(null);
    notificarConsulta();
    expect(observador).toHaveBeenCalledTimes(1);
  });

  it("un observador que lanza no propaga el error", () => {
    registrarObservadorConsultas(() => {
      throw new Error("cache() sin contexto de request");
    });
    expect(() => notificarConsulta()).not.toThrow();
  });
});

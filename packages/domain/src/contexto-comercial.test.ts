import { describe, expect, it } from "vitest";

import {
  contextoParaGenerar,
  estadoInicialContexto,
  puedeConfirmarContexto,
  type EntradaContexto,
} from "./contexto-comercial";

const e = (o: Partial<EntradaContexto>): EntradaContexto => ({
  tipo: "reunion",
  resumen: "Piden cobertura nocturna",
  fuente: "Reunión con gerencia",
  fechaFuente: "2026-11-05",
  estado: "confirmado",
  ...o,
});

describe("contexto comercial", () => {
  it("una persona puede registrar confirmado; un agente o el sistema siempre infieren", () => {
    expect(estadoInicialContexto("user", "confirmado")).toBe("confirmado");
    expect(estadoInicialContexto("user", undefined)).toBe("inferido");
    expect(estadoInicialContexto("agent", "confirmado")).toBe("inferido");
    expect(estadoInicialContexto("system", "confirmado")).toBe("inferido");
  });

  it("solo una persona confirma", () => {
    expect(puedeConfirmarContexto("user")).toBe(true);
    expect(puedeConfirmarContexto("agent")).toBe(false);
  });

  it("por defecto alimenta solo con lo confirmado, más reciente primero y con fuente y fecha", () => {
    const l = contextoParaGenerar([
      e({ fechaFuente: "2026-10-01", resumen: "Antiguo" }),
      e({ estado: "inferido", resumen: "Quizá amplían" }),
      e({ fechaFuente: "2026-11-05" }),
    ]);
    expect(l).toEqual([
      "2026-11-05 · Reunión con gerencia: Piden cobertura nocturna",
      "2026-10-01 · Reunión con gerencia: Antiguo",
    ]);
  });

  it("lo inferido, si se incluye, va rotulado y respeta el máximo", () => {
    const l = contextoParaGenerar([e({ estado: "inferido", resumen: "Quizá amplían" }), e({})], {
      incluirInferido: true,
      maxEntradas: 1,
    });
    expect(l).toHaveLength(1);
    const todos = contextoParaGenerar([e({ estado: "inferido", resumen: "Quizá" })], {
      incluirInferido: true,
    });
    expect(todos[0]).toContain("(inferido)");
  });
});

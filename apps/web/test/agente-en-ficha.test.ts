import { describe, expect, it } from "vitest";

import { preguntasDeFicha } from "@/app/_components/agente/preguntas-ficha";

// CAR-335 D5: cada tipo de ficha con agente trae sus preguntas sugeridas.
describe("preguntas sugeridas del agente en la ficha", () => {
  it("cada tipo de ficha tiene tres preguntas cortas", () => {
    for (const tipo of ["cuenta", "instalacion", "negocio", "persona"] as const) {
      const p = preguntasDeFicha(tipo);
      expect(p).toHaveLength(3);
      for (const q of p) expect(q.length).toBeLessThanOrEqual(40);
    }
  });
});

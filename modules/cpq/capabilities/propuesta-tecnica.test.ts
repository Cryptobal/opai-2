import { describe, expect, it } from "vitest";

import { assertPuedeCongelarPropuesta, exigirDestinatariosEnvio } from "../domain/documento/propuesta-tecnica";

describe("propuesta técnica envío congelado (CAR-144)", () => {
  it("rechaza congelar dos veces", () => {
    expect(() => assertPuedeCongelarPropuesta("congelada")).toThrow("PROPUESTA_YA_CONGELADA");
  });

  it("exige destinatarios válidos", () => {
    const d = exigirDestinatariosEnvio([{ email: "cliente@test.cl" }]);
    expect(d[0]?.email).toBe("cliente@test.cl");
  });
});

import { describe, expect, it } from "vitest";

import { DIAS_RETENCION_INTENTO_DENEGADO, DIAS_RETENCION_REGISTRO_ACCESO } from "./retencion";

describe("retención de accesos (R18)", () => {
  it("usa los plazos por defecto del módulo", () => {
    expect(DIAS_RETENCION_REGISTRO_ACCESO).toBe(90);
    expect(DIAS_RETENCION_INTENTO_DENEGADO).toBe(180);
  });
});
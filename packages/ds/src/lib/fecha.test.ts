import { describe, expect, it } from "vitest";

import { aplicarMascara, isoAMascara, mascaraAIso } from "./fecha";

describe("fecha es-CL", () => {
  it("agrupa dígitos como dd-mm-aaaa mientras se escribe", () => {
    expect(aplicarMascara("2")).toBe("2");
    expect(aplicarMascara("231")).toBe("23-1");
    expect(aplicarMascara("23102026")).toBe("23-10-2026");
    expect(aplicarMascara("23/10/2026999")).toBe("23-10-2026");
    expect(aplicarMascara("2026-10-23")).toBe("23-10-2026");
  });
  it("convierte entre ISO y dd-mm-aaaa", () => {
    expect(isoAMascara("2026-10-23")).toBe("23-10-2026");
    expect(isoAMascara("")).toBe("");
    expect(mascaraAIso("23-10-2026")).toBe("2026-10-23");
  });
  it("rechaza fechas incompletas o inexistentes", () => {
    expect(mascaraAIso("23-10-20")).toBe("");
    expect(mascaraAIso("31-02-2026")).toBe("");
    expect(mascaraAIso("29-02-2028")).toBe("2028-02-29");
    expect(mascaraAIso("00-01-2026")).toBe("");
  });
});

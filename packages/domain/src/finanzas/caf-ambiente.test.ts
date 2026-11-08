import { describe, expect, it } from "vitest";

import { ambienteCafDeRango, ambienteCafDesdeLectura, cafCompatibleConAmbiente } from "./caf-ambiente";

describe("ambiente del CAF (CAR-196)", () => {
  const base = { rutEmisor: "76111222-8" };
  it("IDK 100 = certificación, 300 = producción, el resto sin determinar", () => {
    expect(ambienteCafDesdeLectura({ ...base, idk: "100" })).toBe("certificacion");
    expect(ambienteCafDesdeLectura({ ...base, idk: "300" })).toBe("produccion");
    expect(ambienteCafDesdeLectura({ ...base, idk: "301" })).toBeNull();
    expect(ambienteCafDesdeLectura({ ...base, idk: null })).toBeNull();
    expect(ambienteCafDesdeLectura({ ...base, idk: "CERT-SINTETICO-OPAI2-TEST" })).toBe("certificacion");
  });
  it("el ambiente guardado manda; sin él se deriva del IDK", () => {
    expect(ambienteCafDeRango({ cafAmbiente: "certificacion", cafIdk: "300" })).toBe("certificacion");
    expect(ambienteCafDeRango({ cafAmbiente: null, cafIdk: "300" })).toBe("produccion");
    expect(ambienteCafDeRango({ cafAmbiente: "otro", cafIdk: null })).toBeNull();
  });
  it("rechaza un CAF de otro ambiente o indeterminado", () => {
    expect(cafCompatibleConAmbiente({ cafIdk: "300" }, "certificacion")).toEqual({ ok: false, motivo: "distinto" });
    expect(cafCompatibleConAmbiente({ cafIdk: "100" }, "produccion")).toEqual({ ok: false, motivo: "distinto" });
    expect(cafCompatibleConAmbiente({ cafIdk: "100" }, "certificacion")).toEqual({ ok: true });
    expect(cafCompatibleConAmbiente({ cafIdk: "999" }, "certificacion")).toEqual({ ok: false, motivo: "sin_determinar" });
  });
});

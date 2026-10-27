import { describe, expect, it } from "vitest";

import { mfaEsObligatoria, pendienteMfa } from "@opai/domain";

describe("política MFA pura (sin Prisma ni DATABASE_URL)", () => {
  it("plataforma/owner/admin son obligatorios aunque el tenant intente apagarlo", () => {
    expect(mfaEsObligatoria("support", null, false)).toBe(true);
    for (const rol of ["owner", "admin"]) expect(mfaEsObligatoria(null, rol, false)).toBe(true);
  });
  it("el ajuste solo agrega exigencia a los demás roles", () => {
    expect(mfaEsObligatoria(null, "viewer", false)).toBe(false);
    expect(mfaEsObligatoria(null, "viewer", true)).toBe(true);
    expect(mfaEsObligatoria(null, null, false)).toBe(false);
  });
  it("Google u otro login con MFA activo sin marca exige verificar esta sesión", () => {
    expect(pendienteMfa({ activa: true, verificada: false, obligatoria: false })).toBe("verificar");
    expect(pendienteMfa({ activa: false, verificada: true, obligatoria: true })).toBe("enrolar");
    expect(pendienteMfa({ activa: true, verificada: true, obligatoria: true })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { mfaEsObligatoria, pendienteMfa } from "@opai/domain";

describe("política MFA pura (sin Prisma ni DATABASE_URL)", () => {
  it("solo las cuentas de plataforma lo exigen (CAR-286)", () => {
    expect(mfaEsObligatoria("support")).toBe(true);
    expect(mfaEsObligatoria("owner")).toBe(true);
    expect(mfaEsObligatoria(null)).toBe(false);
  });
  it("owner y admin sin segundo factor entran solo con contraseña", () => {
    expect(pendienteMfa({ activa: false, verificada: false, obligatoria: false })).toBeNull();
  });
  it("Google u otro login con MFA activo sin marca exige verificar esta sesión", () => {
    expect(pendienteMfa({ activa: true, verificada: false, obligatoria: false })).toBe("verificar");
    expect(pendienteMfa({ activa: false, verificada: true, obligatoria: true })).toBe("enrolar");
    expect(pendienteMfa({ activa: true, verificada: true, obligatoria: true })).toBeNull();
  });
});

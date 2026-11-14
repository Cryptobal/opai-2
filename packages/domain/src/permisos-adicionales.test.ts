// CAR-359: los roles adicionales del miembro y los de sus grupos se suman al rol principal; una
// excepción que deniega sigue ganando; sin roles adicionales, el acceso es idéntico al de antes.
import { describe, expect, it } from "vitest";

import { CLASES_BASE } from "./permisos-base";
import { type Acceso, tienePermisoEfectivo } from "./permisos-efectivos";

const ROLES = ["owner", "admin", "gerente", "supervisor", "viewer"] as const;

describe("permisos adicionales (CAR-359)", () => {
  it("suman a un rol base lo que el rol base no tiene", () => {
    const acceso: Acceso = { rol: "viewer", permisosAdicionales: ["rendiciones:aprobar"] };
    expect(tienePermisoEfectivo({ rol: "viewer" }, "rendiciones:aprobar")).toBe(false);
    expect(tienePermisoEfectivo(acceso, "rendiciones:aprobar")).toBe(true);
  });

  it("suman a un rol personalizado, con comodín", () => {
    const acceso: Acceso = {
      rol: null,
      permisosRol: ["comercial:cuentas.read"],
      permisosAdicionales: ["rendiciones:*"],
    };
    expect(tienePermisoEfectivo(acceso, "comercial:cuentas.read")).toBe(true);
    expect(tienePermisoEfectivo(acceso, "rendiciones:aprobar")).toBe(true);
    expect(tienePermisoEfectivo(acceso, "finanzas:read")).toBe(false);
  });

  it("una excepción que deniega gana sobre un rol adicional", () => {
    const acceso: Acceso = {
      rol: "viewer",
      permisosAdicionales: ["rendiciones:*"],
      excepciones: [{ permiso: "rendiciones:aprobar", conceder: false }],
    };
    expect(tienePermisoEfectivo(acceso, "rendiciones:aprobar")).toBe(false);
    expect(tienePermisoEfectivo(acceso, "rendiciones:read")).toBe(true);
  });

  it("nunca conceden permisos de plataforma", () => {
    const acceso: Acceso = { rol: "viewer", permisosAdicionales: ["*", "platform:*"] };
    expect(tienePermisoEfectivo(acceso, "platform:tenants.manage")).toBe(false);
  });

  it("sin roles adicionales el acceso es idéntico al de antes (equivalencia)", () => {
    const catalogo = [...Object.keys(CLASES_BASE), "finanzas:read", "nomina:read"];
    for (const rol of ROLES) {
      for (const p of catalogo) {
        const antes = tienePermisoEfectivo({ rol }, p);
        expect(tienePermisoEfectivo({ rol, permisosAdicionales: [] }, p)).toBe(antes);
        expect(tienePermisoEfectivo({ rol, permisosAdicionales: null }, p)).toBe(antes);
      }
    }
  });
});

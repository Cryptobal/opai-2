import { describe, expect, it } from "vitest";

import { loginDe } from "@/lib/servidor";

// Sin sesión, cada portal manda a su ingreso: el Portal Trabajador a RUT + PIN, el resto al de correo.
describe("ingreso al que redirige una ruta sin sesión (CAR-78 B1)", () => {
  it("las rutas del Portal Trabajador van al login de RUT + PIN y conservan el destino", () => {
    expect(loginDe("/trabajador")).toBe("/trabajador/login?next=%2Ftrabajador");
    expect(loginDe("/trabajador/cambiar-pin")).toBe(
      "/trabajador/login?next=%2Ftrabajador%2Fcambiar-pin",
    );
    expect(loginDe("/trabajador/mas")).toBe("/trabajador/login?next=%2Ftrabajador%2Fmas");
  });

  it("el resto de los portales sigue yendo al login de correo", () => {
    expect(loginDe("/personas")).toBe("/login?next=%2Fpersonas");
    expect(loginDe("/trabajadores-externos")).toBe("/login?next=%2Ftrabajadores-externos");
    expect(loginDe()).toBe("/login");
  });
});

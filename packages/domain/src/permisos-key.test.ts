import { describe, expect, it } from "vitest";

import { permisoDeKey } from "./permisos-key";
import { type Acceso, tienePermisoEfectivo } from "./permisos-efectivos";

describe("permisos finos por key", () => {
  it.each([false, true])(
    "respeta baja de rol, personalizado y excepción (servicio=%s)",
    (servicio) => {
      const permiso = "core:instalaciones.manage";
      const autoriza = (acceso: Acceso) =>
        permisoDeKey(permiso, [permiso], servicio, (p) => tienePermisoEfectivo(acceso, p));
      expect(autoriza({ rol: "gerente" })).toBe(true);
      expect(autoriza({ rol: "viewer" })).toBe(false);
      expect(autoriza({ rol: null, permisosRol: [permiso] })).toBe(true);
      expect(autoriza({ rol: null, permisosRol: [] })).toBe(false);
      expect(autoriza({ rol: "gerente", excepciones: [{ permiso, conceder: false }] })).toBe(false);
    },
  );
  it("intersecta con los efectivos del responsable, incluso si pierde permisos", () => {
    const lista = ["core:cuentas.read", "core:cuentas.manage"];
    const permite = (p: string) => p.endsWith(".read");
    expect(permisoDeKey(lista[0]!, lista, false, permite)).toBe(true);
    expect(permisoDeKey(lista[1]!, lista, false, permite)).toBe(false);
    expect(permisoDeKey("core:users.manage", lista, false, () => true)).toBe(false);
  });
  it("null hereda; servicio exige lista explícita y nunca plataforma", () => {
    expect(permisoDeKey("core:cuentas.read", null, false, () => true)).toBe(true);
    expect(permisoDeKey("core:cuentas.read", null, true, () => true)).toBe(false);
    expect(permisoDeKey("core:cuentas.read", ["core:cuentas.read"], true, () => true)).toBe(true);
    expect(
      permisoDeKey("platform:tenants.manage", ["platform:tenants.manage"], true, () => true),
    ).toBe(false);
  });
  it("servicio también intersecta con los efectivos actuales del responsable (H15)", () => {
    const lista = ["core:cuentas.read", "core:cuentas.manage"];
    // El responsable bajó a un rol que ya no concede `manage`: la key tampoco puede.
    const permite = (p: string) => p.endsWith(".read");
    expect(permisoDeKey(lista[0]!, lista, true, permite)).toBe(true);
    expect(permisoDeKey(lista[1]!, lista, true, permite)).toBe(false);
    // El responsable perdió el permiso por completo (p. ej. excepción que deniega): falla cerrado.
    expect(permisoDeKey("core:cuentas.read", ["core:cuentas.read"], true, () => false)).toBe(false);
  });
});

import { PERMISOS_CORE } from "@opai/domain";
import { describe, expect, it } from "vitest";

import { construirPuede } from "@/lib/permisos-ui";

/** `construirPuede` debe usar los permisos efectivos (rol personalizado + excepciones), no el rol base. */
describe("construirPuede (permisos efectivos de la UI)", () => {
  it("rol base: concede lo que el rol base concede", () => {
    const puede = construirPuede("admin", { permisosRol: null, excepciones: [], instalaciones: null });
    expect(puede(PERMISOS_CORE.marcaManage)).toBe(true);
    expect(puede(PERMISOS_CORE.tenantDelete)).toBe(false);
  });

  it("rol personalizado: manda su lista de permisos, no el rol base", () => {
    // Rol base gerente (que NO gestiona marca) pero con un personalizado que solo ve cuentas.
    const puede = construirPuede("gerente", {
      permisosRol: [PERMISOS_CORE.cuentasRead],
      excepciones: [],
      instalaciones: null,
    });
    expect(puede(PERMISOS_CORE.cuentasRead)).toBe(true);
    expect(puede(PERMISOS_CORE.instalacionesRead)).toBe(false);
  });

  it("una excepción que concede habilita un permiso que el rol no da", () => {
    const puede = construirPuede("viewer", {
      permisosRol: null,
      excepciones: [{ permiso: PERMISOS_CORE.usersManage, conceder: true }],
      instalaciones: null,
    });
    expect(puede(PERMISOS_CORE.usersManage)).toBe(true);
  });

  it("una excepción que deniega gana sobre el rol", () => {
    const puede = construirPuede("admin", {
      permisosRol: null,
      excepciones: [{ permiso: PERMISOS_CORE.marcaManage, conceder: false }],
      instalaciones: null,
    });
    expect(puede(PERMISOS_CORE.marcaManage)).toBe(false);
  });

  it("nunca concede permisos de plataforma por un rol del tenant", () => {
    const puede = construirPuede("owner", { permisosRol: null, excepciones: [], instalaciones: null });
    expect(puede("platform:tenants.manage")).toBe(false);
  });
});

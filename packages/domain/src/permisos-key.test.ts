import { describe, expect, it } from "vitest";

import { permisoDeKey } from "./permisos-key";

describe("permisos finos por key", () => {
  it("intersecta con los efectivos del responsable, incluso si pierde permisos", () => {
    const lista = ["core:cuentas.read", "core:cuentas.manage"];
    const permite = (p: string) => p.endsWith(".read");
    expect(permisoDeKey(lista[0]!, lista, false, permite)).toBe(true);
    expect(permisoDeKey(lista[1]!, lista, false, permite)).toBe(false);
    expect(permisoDeKey("core:users.manage", lista, false, () => true)).toBe(false);
  });
  it("null hereda; servicio solo usa la lista explícita y nunca plataforma", () => {
    expect(permisoDeKey("core:cuentas.read", null, false, () => true)).toBe(true);
    expect(permisoDeKey("core:cuentas.read", null, true, () => true)).toBe(false);
    expect(permisoDeKey("core:cuentas.read", ["core:cuentas.read"], true, () => false)).toBe(true);
    expect(
      permisoDeKey("platform:tenants.manage", ["platform:tenants.manage"], true, () => true),
    ).toBe(false);
  });
});

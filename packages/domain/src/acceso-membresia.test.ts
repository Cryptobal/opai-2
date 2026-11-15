// CAR-359: un solo cálculo del acceso de una membresía leída de la base, igual que en la sesión.
import { describe, expect, it } from "vitest";

import { accesoDeMembresia } from "./acceso-membresia";
import { tienePermisoEfectivo } from "./permisos-efectivos";

const rol = (permisos: string[], archivadoEn: Date | null = null) => ({
  rol: { permisos, archivadoEn },
});
const base = { rolesAdicionales: [], gruposUsuarios: [], excepciones: [], rolTenant: null };

describe("accesoDeMembresia", () => {
  it("sin rol personalizado manda el rol base", () => {
    const a = accesoDeMembresia({ ...base, rol: "viewer" });
    expect(a).toMatchObject({ rol: "viewer", permisosRol: null, permisosAdicionales: [] });
  });

  it("un rol personalizado archivado deniega y no vuelve al rol base", () => {
    const a = accesoDeMembresia({
      ...base,
      rol: "admin",
      rolTenant: { permisos: ["*"], archivadoEn: new Date() },
    });
    expect(tienePermisoEfectivo(a, "core:cuentas.read")).toBe(false);
  });

  it("suma roles adicionales y de grupos vigentes; la excepción que deniega gana", () => {
    const a = accesoDeMembresia({
      ...base,
      rol: "viewer",
      excepciones: [{ permiso: "rendiciones:aprobar", conceder: false }],
      rolesAdicionales: [rol(["core:cuentas.manage"])],
      gruposUsuarios: [{ grupo: { archivadoEn: null, roles: [rol(["rendiciones:*"])] } }],
    });
    expect(tienePermisoEfectivo(a, "core:cuentas.manage")).toBe(true);
    expect(tienePermisoEfectivo(a, "rendiciones:rendir")).toBe(true);
    expect(tienePermisoEfectivo(a, "rendiciones:aprobar")).toBe(false);
  });
});

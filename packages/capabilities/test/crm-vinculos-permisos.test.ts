import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { CU, CU2, I1, K1, reiniciarComercial, semillaComercial } from "./comercial-ayuda";
import { codigo, dato } from "./maestros-ayuda";

beforeEach(reiniciarComercial);

function entorno(permisos: string[], instalaciones: string[] | null = null) {
  return contextoDePrueba({
    rol: "viewer",
    permisosRol: permisos,
    alcance: instalaciones ? { instalaciones } : null,
    semilla: {
      ...semillaComercial(),
      contactoCuenta: [CU, CU2].map((cuentaId) => ({
        id: cuentaId,
        cuentaId,
        contactoId: K1,
        tenantId: TENANT_DE_PRUEBA,
        cargo: null,
        roles: [],
        esPrincipal: false,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      })),
    },
  });
}
const escrituras = [
  "core.contactos.vincular",
  "core.contactos.set_roles",
  "core.contactos.desvincular",
];

describe("CAR-131 · el servidor protege los vínculos aunque se invoquen sin controles UI", () => {
  it.each(escrituras)("sin escritura no ejecuta %s, tampoco la vista previa", async (id) => {
    const { ctx, tabla } = entorno(["core:cuentas.read"]);
    for (const dryRun of [false, true]) {
      expect(
        await codigo(
          ctx,
          id,
          {
            contactoId: K1,
            cuentaId: CU2,
            esPrincipal: true,
            roles: ["cesion"],
            permisos: ["*"],
            alcance: null,
          },
          { dryRun },
        ),
      ).toBe("FORBIDDEN");
    }
    expect(tabla("contactoCuenta").every((v) => !v["esPrincipal"])).toBe(true);
  });

  it.each(escrituras)("con escritura, cuenta fuera de alcance da NOT_FOUND en %s", async (id) => {
    const { ctx } = entorno(["core:cuentas.read", "core:cuentas.manage"], [I1]);
    for (const dryRun of [false, true]) {
      expect(await codigo(ctx, id, { contactoId: K1, cuentaId: CU2 }, { dryRun })).toBe(
        "NOT_FOUND",
      );
    }
  });

  it("la lectura no revela las cuentas fuera del alcance", async () => {
    const { ctx } = entorno(["core:cuentas.read"], [I1]);
    const cuentas = await dato<{ cuentaId: string }[]>(ctx, "core.contactos.cuentas", {
      contactoId: K1,
    });
    expect(cuentas.map((v) => v.cuentaId)).toEqual([CU]);
    expect(await codigo(ctx, "core.cuentas.contactos", { cuentaId: CU2 })).toBe("NOT_FOUND");
  });

  it("sin permiso de lectura no revela ningún vínculo", async () => {
    const { ctx } = entorno([]);
    expect(await codigo(ctx, "core.contactos.cuentas", { contactoId: K1 })).toBe("FORBIDDEN");
    expect(await codigo(ctx, "core.cuentas.contactos", { cuentaId: CU })).toBe("FORBIDDEN");
  });
});

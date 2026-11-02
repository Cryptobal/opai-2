import { contextoDePrueba, USUARIO_DE_PRUEBA } from "@opai/capabilities/testing";
import { describe, expect, it } from "vitest";

import { evaluarAprobacionMargen } from "./aprobacion-reglas";

const USUARIO_ADMIN = {
  id: "0192f3a0-0000-7000-8000-0000000000b2",
  nombre: "Beto Admin",
  email: "admin@prueba.cl",
  platformRole: null,
};

describe("reglas N6 de aprobación de margen", () => {
  it("owner autoaprueba la propia; admin la de otro; admin no la propia", () => {
    const owner = contextoDePrueba({ rol: "owner" }).ctx;
    const admin = contextoDePrueba({ rol: "admin", usuario: USUARIO_ADMIN }).ctx;
    const propiaOwner = evaluarAprobacionMargen(owner, USUARIO_DE_PRUEBA.id);
    expect(propiaOwner).toMatchObject({ puedeDecidir: true, autoaprobacion: true });
    const ajenaAdmin = evaluarAprobacionMargen(admin, USUARIO_DE_PRUEBA.id);
    expect(ajenaAdmin).toMatchObject({ puedeDecidir: true, autoaprobacion: false });
    const propiaAdmin = evaluarAprobacionMargen(admin, USUARIO_ADMIN.id);
    expect(propiaAdmin.puedeDecidir).toBe(false);
    expect(propiaAdmin.motivoNoDecidir).toMatch(/admin no puede aprobar su propia/i);
  });

  it("owner no aprueba la cotización de otro", () => {
    const owner = contextoDePrueba({ rol: "owner" }).ctx;
    const ajena = evaluarAprobacionMargen(owner, USUARIO_ADMIN.id);
    expect(ajena.puedeDecidir).toBe(false);
    expect(ajena.motivoNoDecidir).toMatch(/admin puede aprobar/i);
  });

  it("gerente no decide aunque tenga otros permisos CPQ", () => {
    const gerente = contextoDePrueba({ rol: "gerente", modulosActivos: ["comercial", "cpq"] }).ctx;
    const r = evaluarAprobacionMargen(gerente, USUARIO_DE_PRUEBA.id);
    expect(r.puedeDecidir).toBe(false);
  });
});

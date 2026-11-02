import { contextoDePrueba, USUARIO_DE_PRUEBA } from "@opai/capabilities/testing";
import { describe, expect, it } from "vitest";

import { evaluarAprobacionMargen } from "./aprobacion-reglas";

const USUARIO_ADMIN = {
  id: "0192f3a0-0000-7000-8000-0000000000b2",
  nombre: "Beto Admin",
  email: "admin@prueba.cl",
  platformRole: null,
};

const CREADOR_AJENO = USUARIO_ADMIN.id;

describe("reglas N6 de aprobación de margen", () => {
  it("owner autoaprueba la propia (creador); admin la ajena; admin no la propia", () => {
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

  it("owner aprueba cotización creada por otro con autoaprobacion false", () => {
    const owner = contextoDePrueba({ rol: "owner" }).ctx;
    const ajena = evaluarAprobacionMargen(owner, CREADOR_AJENO);
    expect(ajena).toMatchObject({ puedeDecidir: true, autoaprobacion: false });
  });

  it("gerente con excepción cpq:aprobar no decide", () => {
    const gerente = contextoDePrueba({
      rol: "gerente",
      modulosActivos: ["comercial", "cpq"],
      excepciones: [{ permiso: "cpq:aprobar", conceder: true }],
    }).ctx;
    const r = evaluarAprobacionMargen(gerente, USUARIO_DE_PRUEBA.id);
    expect(r.puedeDecidir).toBe(false);
    expect(r.motivoNoDecidir).toMatch(/owner o un admin/i);
  });
});

import { describe, expect, it } from "vitest";

import {
  evaluarAprobacionEnvioPropuesta,
  ownerPuedeAutoaprobarEnvioPropio,
  solicitantePuedeAprobarEnvioFueraMargen,
} from "./propuesta-envio-reglas";

const SOLICITANTE = "0192f3a0-0000-7000-8000-0000000000a1";
const OTRO = "0192f3a0-0000-7000-8000-0000000000b2";

function base(overrides: Partial<Parameters<typeof evaluarAprobacionEnvioPropuesta>[0]> = {}) {
  return {
    actorTipo: "user",
    actorId: SOLICITANTE,
    rol: "owner" as const,
    autorizaEnviosAprobar: true,
    solicitadoPorId: SOLICITANTE,
    fueraDeMargenes: false,
    ...overrides,
  };
}

describe("política de aprobación de envíos (CAR-144)", () => {
  it("dentro de márgenes: owner autoaprueba la propia", () => {
    const r = evaluarAprobacionEnvioPropuesta(base());
    expect(r).toMatchObject({ puedeDecidir: true, autoaprobacion: true });
    expect(ownerPuedeAutoaprobarEnvioPropio()).toBe(true);
  });

  it("dentro de márgenes: admin no aprueba la propia", () => {
    const r = evaluarAprobacionEnvioPropuesta(
      base({ rol: "admin", actorId: OTRO, solicitadoPorId: OTRO }),
    );
    expect(r.puedeDecidir).toBe(false);
    expect(r.motivoNoDecidir).toMatch(/solicitaste tú/i);
  });

  it("fuera de márgenes: quien solicitó no aprueba (bandera única)", () => {
    expect(solicitantePuedeAprobarEnvioFueraMargen()).toBe(false);
    const r = evaluarAprobacionEnvioPropuesta(base({ fueraDeMargenes: true }));
    expect(r.puedeDecidir).toBe(false);
    expect(r.motivoNoDecidir).toMatch(/Fuera de márgenes/i);
  });

  it("fuera de márgenes: otro admin con Aprobar envíos sí decide", () => {
    const r = evaluarAprobacionEnvioPropuesta(
      base({
        fueraDeMargenes: true,
        rol: "admin",
        actorId: OTRO,
        solicitadoPorId: SOLICITANTE,
      }),
    );
    expect(r).toMatchObject({ puedeDecidir: true, autoaprobacion: false });
  });

  it("gerente con permiso de envíos no decide (solo owner/admin)", () => {
    const r = evaluarAprobacionEnvioPropuesta(
      base({ rol: "gerente", actorId: OTRO, solicitadoPorId: SOLICITANTE }),
    );
    expect(r.puedeDecidir).toBe(false);
    expect(r.motivoNoDecidir).toMatch(/owner o un admin/i);
  });
});

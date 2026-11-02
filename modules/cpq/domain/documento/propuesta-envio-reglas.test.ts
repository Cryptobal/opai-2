import { describe, expect, it } from "vitest";

import {
  autoaprobacionPrivilegioEnvio,
  debeQuedarPendienteAprobacionEnvio,
  evaluarAprobacionEnvioPropuesta,
  fueraDeMargenesEnvioConjunto,
} from "./propuesta-envio-reglas";

const SOLICITANTE = "0192f3a0-0000-7000-8000-0000000000a1";
const OTRO = "0192f3a0-0000-7000-8000-0000000000b2";

describe("política de envío conjunto (Carlos, CAR-144)", () => {
  it("dentro de márgenes: no queda pendiente (cualquier rol)", () => {
    expect(fueraDeMargenesEnvioConjunto(false)).toBe(false);
    expect(debeQuedarPendienteAprobacionEnvio(false, "gerente")).toBe(false);
    expect(debeQuedarPendienteAprobacionEnvio(false, "owner")).toBe(false);
  });

  it("fuera de márgenes: gerente queda pendiente; owner/admin envían directo", () => {
    expect(fueraDeMargenesEnvioConjunto(true)).toBe(true);
    expect(debeQuedarPendienteAprobacionEnvio(true, "gerente")).toBe(true);
    expect(debeQuedarPendienteAprobacionEnvio(true, "owner")).toBe(false);
    expect(debeQuedarPendienteAprobacionEnvio(true, "admin")).toBe(false);
  });

  it("fuera de márgenes: quien solicitó no aprueba; otro con permiso sí", () => {
    const propia = evaluarAprobacionEnvioPropuesta({
      actorTipo: "user",
      actorId: SOLICITANTE,
      rol: "gerente",
      autorizaEnviosAprobar: true,
      solicitadoPorId: SOLICITANTE,
    });
    expect(propia.puedeDecidir).toBe(false);
    const ajena = evaluarAprobacionEnvioPropuesta({
      actorTipo: "user",
      actorId: OTRO,
      rol: "gerente",
      autorizaEnviosAprobar: true,
      solicitadoPorId: SOLICITANTE,
    });
    expect(ajena).toMatchObject({ puedeDecidir: true, autoaprobacion: false });
  });

  it("owner/admin fuera de márgenes: pueden aprobar/enviar aunque lo hayan solicitado", () => {
    const owner = evaluarAprobacionEnvioPropuesta({
      actorTipo: "user",
      actorId: SOLICITANTE,
      rol: "owner",
      autorizaEnviosAprobar: true,
      solicitadoPorId: SOLICITANTE,
    });
    expect(owner).toMatchObject({ puedeDecidir: true, autoaprobacion: true });
    expect(
      autoaprobacionPrivilegioEnvio({
        fueraDeMargenes: true,
        rol: "owner",
        actorId: SOLICITANTE,
        solicitadoPorId: SOLICITANTE,
      }),
    ).toBe(true);
  });
});

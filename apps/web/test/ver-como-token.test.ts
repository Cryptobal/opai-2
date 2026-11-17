// CAR-528: la cookie de «ver como» va firmada; alterarla, falsificarla o dejarla vencer la invalida.
import { beforeAll, describe, expect, it } from "vitest";

import { firmarVerComo, leerVerComo, type VerComo } from "../lib/ver-como-token";

const AHORA = Date.parse("2026-11-15T12:00:00Z");
const vista: VerComo = {
  tenantId: "t-qa-e2e",
  porUserId: "u-admin",
  sesionId: "s-1",
  portal: "trabajador",
  objetivoId: "0192f3a0-0000-7000-8000-00000000c001",
  nombre: "Persona Prueba",
  userId: "u-persona",
  dispositivoId: null,
  expira: AHORA + 30 * 60_000,
};

beforeAll(() => {
  process.env["BETTER_AUTH_SECRET"] ??= "secreto-de-prueba-ver-como-solo-tests";
});

describe("cookie de «ver como»", () => {
  it("lee lo que firmó mientras no vence", () => {
    expect(leerVerComo(firmarVerComo(vista), AHORA)).toEqual(vista);
    expect(leerVerComo(firmarVerComo(vista), vista.expira)).toBeNull();
  });

  it("rechaza un cuerpo alterado, una firma ajena o un formato inválido", () => {
    const [, sello] = firmarVerComo(vista).split(".");
    const otro = Buffer.from(JSON.stringify({ ...vista, userId: "u-owner" })).toString("base64url");
    expect(leerVerComo(`${otro}.${sello}`, AHORA)).toBeNull();
    expect(leerVerComo(`${otro}.AAAA`, AHORA)).toBeNull();
    for (const malo of [undefined, "", "a", "a.b.c"]) expect(leerVerComo(malo, AHORA)).toBeNull();
  });
});

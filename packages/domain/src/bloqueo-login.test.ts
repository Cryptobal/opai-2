import { describe, expect, it } from "vitest";

import {
  type ConteosLogin,
  LOGIN_LIMITE_CORREO,
  LOGIN_LIMITE_CORREO_IP,
  LOGIN_LIMITE_IP,
  LOGIN_VENTANA_MINUTOS,
  LOGIN_VENTANA_MS,
  superaLimiteLogin,
} from "./bloqueo-login";

const sin: ConteosLogin = { correoIp: 0, correo: 0, ip: 0 };

describe("bloqueo de login por conteo de fallos (B1)", () => {
  it("la ventana en ms deriva de los minutos", () => {
    expect(LOGIN_VENTANA_MS).toBe(LOGIN_VENTANA_MINUTOS * 60_000);
  });

  it("sin fallos no pausa", () => {
    expect(superaLimiteLogin(sin)).toBe(false);
  });

  it("pausa al alcanzar el límite de correo+IP, no antes", () => {
    expect(superaLimiteLogin({ ...sin, correoIp: LOGIN_LIMITE_CORREO_IP - 1 })).toBe(false);
    expect(superaLimiteLogin({ ...sin, correoIp: LOGIN_LIMITE_CORREO_IP })).toBe(true);
  });

  it("pausa al alcanzar el tope global por correo aunque cada IP esté por debajo", () => {
    expect(superaLimiteLogin({ ...sin, correo: LOGIN_LIMITE_CORREO - 1 })).toBe(false);
    expect(superaLimiteLogin({ ...sin, correo: LOGIN_LIMITE_CORREO })).toBe(true);
  });

  it("pausa al alcanzar el tope compartido por IP", () => {
    expect(superaLimiteLogin({ ...sin, ip: LOGIN_LIMITE_IP - 1 })).toBe(false);
    expect(superaLimiteLogin({ ...sin, ip: LOGIN_LIMITE_IP })).toBe(true);
  });

  it("el tope global por correo es más alto que el de correo+IP", () => {
    expect(LOGIN_LIMITE_CORREO).toBeGreaterThan(LOGIN_LIMITE_CORREO_IP);
  });
});

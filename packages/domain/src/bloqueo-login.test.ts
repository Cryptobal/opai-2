import { describe, expect, it } from "vitest";

import {
  cuentaBloqueada,
  esperaBloqueoMs,
  type EstadoBloqueoLogin,
  LOGIN_MAX_FALLOS,
  LOGIN_PAUSA_MINUTOS,
  trasExitoLogin,
  trasFalloLogin,
} from "./bloqueo-login";

const T0 = new Date("2026-10-26T12:00:00.000Z");
const PAUSA_MS = LOGIN_PAUSA_MINUTOS * 60_000;

describe("bloqueo de login (B1)", () => {
  it("un fallo bajo el umbral solo suma, no bloquea", () => {
    const e = trasFalloLogin(null, T0);
    expect(e.fallos).toBe(1);
    expect(e.bloqueadoHasta).toBeNull();
    expect(cuentaBloqueada(e, T0)).toBe(false);
  });

  it("al llegar al umbral fija la pausa desde ese instante", () => {
    let e: EstadoBloqueoLogin | null = null;
    for (let i = 0; i < LOGIN_MAX_FALLOS; i++) e = trasFalloLogin(e, T0);
    expect(e?.fallos).toBe(LOGIN_MAX_FALLOS);
    expect(e?.bloqueadoHasta?.getTime()).toBe(T0.getTime() + PAUSA_MS);
    expect(cuentaBloqueada(e, T0)).toBe(true);
  });

  it("la pausa se levanta sola al vencer", () => {
    const e: EstadoBloqueoLogin = { fallos: LOGIN_MAX_FALLOS, bloqueadoHasta: new Date(T0.getTime() + PAUSA_MS) };
    const justoAntes = new Date(T0.getTime() + PAUSA_MS - 1);
    const justoDespues = new Date(T0.getTime() + PAUSA_MS + 1);
    expect(cuentaBloqueada(e, justoAntes)).toBe(true);
    expect(cuentaBloqueada(e, justoDespues)).toBe(false);
  });

  it("espera restante en milisegundos (0 si no está pausada)", () => {
    const e: EstadoBloqueoLogin = { fallos: LOGIN_MAX_FALLOS, bloqueadoHasta: new Date(T0.getTime() + PAUSA_MS) };
    expect(esperaBloqueoMs(e, T0)).toBe(PAUSA_MS);
    expect(esperaBloqueoMs(null, T0)).toBe(0);
    expect(esperaBloqueoMs(e, new Date(T0.getTime() + PAUSA_MS + 1))).toBe(0);
  });

  it("tras vencer la pausa, un fallo reinicia la ventana (cuenta como el primero)", () => {
    const vencido: EstadoBloqueoLogin = { fallos: LOGIN_MAX_FALLOS, bloqueadoHasta: new Date(T0.getTime() - 1) };
    const e = trasFalloLogin(vencido, T0);
    expect(e.fallos).toBe(1);
    expect(e.bloqueadoHasta).toBeNull();
  });

  it("un ingreso correcto limpia el contador y la pausa", () => {
    const e = trasExitoLogin();
    expect(e.fallos).toBe(0);
    expect(e.bloqueadoHasta).toBeNull();
    expect(cuentaBloqueada(e, T0)).toBe(false);
  });
});

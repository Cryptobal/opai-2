// CAR-240 · Sin ACTECO (u otro dato tributario del emisor) SimpleAPI rechaza `dte/generar` con HTTP 401 aunque la key
// autentique: se bloquea antes de firmar, con lo que falta y dónde completarlo (paridad con el preflight de OPAI 1.0).
import { describe, expect, it } from "vitest";

import { actecoValido, faltantesEmisorTributario, mensajeFaltantesEmisor } from "../src/finanzas/emisor-tributario";

const completo = {
  razonSocial: "Empresa Ficticia SpA",
  giro: "Servicios de prueba",
  acteco: 801001,
  calle: "Calle Ficticia 123",
  comuna: "Comuna Ficticia",
  ciudad: "Ciudad Ficticia",
};

describe("datos tributarios del emisor", () => {
  it("completo: nada falta", () => {
    expect(faltantesEmisorTributario(completo)).toEqual([]);
    expect(mensajeFaltantesEmisor(completo)).toBeNull();
  });
  it("sin ACTECO ni ciudad (el caso de test.opai.cl del 10-nov): dice ambos y dónde se completa cada uno", () => {
    expect(mensajeFaltantesEmisor({ ...completo, acteco: null, ciudad: " " })).toBe(
      "A la empresa emisora le faltan datos tributarios: ACTECO (actividad económica) y ciudad. " +
        "Completa el ACTECO en Finanzas › Configuración DTE y lo demás en Configuración › Empresa antes de emitir al SII.",
    );
  });
  it("solo el ACTECO: singular y solo la pantalla de Configuración DTE", () => {
    expect(mensajeFaltantesEmisor({ ...completo, acteco: null })).toBe(
      "A la empresa emisora le falta un dato tributario: ACTECO (actividad económica). " +
        "Completa el ACTECO en Finanzas › Configuración DTE antes de emitir al SII.",
    );
  });
  it("solo datos del perfil: en orden razón social, giro, dirección, comuna, ciudad", () => {
    expect(faltantesEmisorTributario({ ...completo, razonSocial: null, giro: "", calle: null, comuna: null, ciudad: null })).toEqual([
      "razón social",
      "giro",
      "dirección",
      "comuna",
      "ciudad",
    ]);
    expect(mensajeFaltantesEmisor({ ...completo, comuna: null })).toMatch(/: comuna\. Completa lo demás en Configuración › Empresa/);
  });
  it("ACTECO válido: entero de 1 a 999.999", () => {
    expect(actecoValido(801001)).toBe(true);
    expect([0, -1, 1.5, 1_000_000, null, undefined].map(actecoValido)).toEqual([false, false, false, false, false, false]);
  });
});

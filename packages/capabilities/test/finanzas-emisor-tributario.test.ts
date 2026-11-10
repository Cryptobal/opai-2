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
  it("sin ACTECO ni ciudad (el caso de test.opai.cl del 10-nov): dice ambos y dónde se completan (CAR-243: todo en la empresa)", () => {
    expect(mensajeFaltantesEmisor({ ...completo, acteco: null, ciudad: " " })).toBe(
      "Faltan datos tributarios de tu empresa: ACTECO y ciudad. " +
        "Complétalos en Configuración › Empresa.",
    );
  });
  it("solo el ACTECO: singular y en la pantalla de la empresa (CAR-243)", () => {
    expect(mensajeFaltantesEmisor({ ...completo, acteco: null })).toBe(
      "Falta un dato tributario de tu empresa: ACTECO. Complétalo en Configuración › Empresa.",
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
    expect(mensajeFaltantesEmisor({ ...completo, comuna: null })).toBe(
      "Falta un dato tributario de tu empresa: comuna. Complétalo en Configuración › Empresa.",
    );
  });
  it("el peor caso cabe en 300 caracteres aun con el prefijo del lote de cierre y la consecuencia de la emisión", () => {
    const nada = { razonSocial: null, giro: null, acteco: null, calle: null, comuna: null, ciudad: null };
    const lote = `No se emitió ningún documento del lote: ${mensajeFaltantesEmisor(nada)} El documento sigue sin emitir y el folio no se usó.`;
    expect(lote.length).toBeLessThanOrEqual(300);
  });
  it("ACTECO válido: entero de 1 a 999.999", () => {
    expect(actecoValido(801001)).toBe(true);
    expect([0, -1, 1.5, 1_000_000, null, undefined].map(actecoValido)).toEqual([false, false, false, false, false, false]);
  });
});

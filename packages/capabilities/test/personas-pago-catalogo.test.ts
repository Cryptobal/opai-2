// CAR-244: la lectura de pago traduce el código SBIF al nombre del catálogo y marca «por corregir» lo escrito a mano.
import { describe, expect, it } from "vitest";

import { catalogoDe } from "../src/core/maestros/personas-pago-vista";
import { personasPagoSolicitarCambio } from "../src/core/maestros/personas-pago";

describe("pago contra el catálogo SBIF (CAR-244)", () => {
  it("código y tipo del catálogo: nombre y etiqueta, nada por corregir", () => {
    expect(catalogoDe("012", "rut")).toEqual({
      bancoNombre: "BancoEstado",
      tipoCuentaEtiqueta: "Cuenta RUT",
      porCorregir: false,
    });
    expect(catalogoDe(null, null)).toEqual({
      bancoNombre: null,
      tipoCuentaEtiqueta: null,
      porCorregir: false,
    });
  });
  it("texto libre: se reconoce si se puede, pero queda por corregir", () => {
    expect(catalogoDe("Banco Estado", "Cuenta RUT")).toEqual({
      bancoNombre: "BancoEstado",
      tipoCuentaEtiqueta: "Cuenta RUT",
      porCorregir: true,
    });
    expect(catalogoDe("Banco Inventado", "corriente").porCorregir).toBe(true);
    expect(catalogoDe("037", "Cuenta Mágica")).toMatchObject({
      bancoNombre: "Santander",
      porCorregir: true,
    });
  });
  it("la solicitud de cambio solo acepta códigos y tipos del catálogo", () => {
    const base = { id: "0190a1b2-c3d4-7e5f-8a6b-7c8d9e0f1a2b", numeroCuenta: "12345678" };
    const ok = personasPagoSolicitarCambio.input.safeParse({
      ...base,
      bancoCodigo: "037",
      tipoCuenta: "corriente",
    });
    expect(ok.success).toBe(true);
    for (const malo of [
      { bancoCodigo: "Santander", tipoCuenta: "corriente" },
      { bancoCodigo: "999", tipoCuenta: "corriente" },
      { bancoCodigo: "037", tipoCuenta: "Cuenta corriente" },
    ])
      expect(personasPagoSolicitarCambio.input.safeParse({ ...base, ...malo }).success).toBe(false);
  });
});

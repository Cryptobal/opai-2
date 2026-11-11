// CAR-244: la lectura de pago traduce el código SBIF al nombre del catálogo y marca «por corregir» lo escrito a mano.
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { BANCOS_SBIF, codigoSbif } from "@opai/domain";

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

describe("la migración de datos de CAR-244 usa el mismo catálogo que el dominio", () => {
  const sql = readFileSync(
    new URL(
      "../../db/prisma/migrations/20261120100000_core_personas_pago_banco_sbif/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const alias = [...sql.matchAll(/^\s+\('([a-z0-9 ]+)', '(\d{3})'\)/gm)].map((m) => [m[1]!, m[2]!]);
  it("cada alias de la migración se reconoce igual en el dominio", () => {
    expect(alias.length).toBeGreaterThan(BANCOS_SBIF.length);
    for (const [clave, codigo] of alias) expect(codigoSbif(clave), clave).toBe(codigo);
  });
  it("cada nombre, alias y código del dominio está en la migración", () => {
    const claves = new Set(alias.map(([c]) => c));
    for (const b of BANCOS_SBIF) {
      expect(claves.has(b.codigo), b.codigo).toBe(true);
      for (const n of [b.nombre, ...(b.alias ?? [])])
        expect(claves.has(codigoSbifClave(n)), n).toBe(true);
    }
  });
});

/** Clave normalizada como la del dominio (sin tildes, minúsculas, solo letras, números y espacios). */
function codigoSbifClave(t: string) {
  return t
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

import { describe, expect, it } from "vitest";

import { referenciasComoArreglo } from "../../scripts/importar-opai1/origen-api-contrato";
import { lectorContratoFixtures } from "../../scripts/importar-opai1/origen-api";
import { validarDatos } from "../../scripts/importar-opai1/origen-lectores";

const FIX = new URL("../fixtures/opai1-export-v1", import.meta.url).pathname;

describe("additionalReferences (Json? en 1.0)", () => {
  it("null, texto JSON y objeto suelto terminan como arreglo de objetos", () => {
    expect(referenciasComoArreglo(null)).toEqual([]);
    expect(referenciasComoArreglo("no es json")).toEqual([]);
    expect(referenciasComoArreglo('[{"folioRef":"1"}]')).toEqual([{ folioRef: "1" }]);
    expect(referenciasComoArreglo({ folioRef: "2" })).toEqual([{ folioRef: "2" }]);
    expect(referenciasComoArreglo([{ folioRef: "3" }, 5, null])).toEqual([{ folioRef: "3" }]);
  });

  it("el lector acepta plantillas con null, texto JSON u objeto", async () => {
    const rec = (await lectorContratoFixtures(FIX).leer()).recurringInvoiceSchedules;
    const por = (id: string) => rec.find((r) => r.id === id);
    expect(por("recurrente-refs-null")?.additionalReferences).toEqual([]);
    expect(por("recurrente-refs-json")?.additionalReferences).toHaveLength(1);
    expect(por("recurrente-refs-obj")?.additionalReferences).toHaveLength(1);
  });

  it("el validador agrupa los campos inválidos con su cantidad, sin valores", () => {
    const fila = { id: "x" };
    let msg = "";
    try {
      validarDatos({ accounts: [fila, fila, fila] });
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain("accounts.N");
    expect(msg).toMatch(/×3/);
  });
});

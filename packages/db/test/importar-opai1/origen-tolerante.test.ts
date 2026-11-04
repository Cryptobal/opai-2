import { describe, expect, it } from "vitest";

import { validarDatos } from "../../scripts/importar-opai1/origen-lectores";

const T = "2026-11-01T09:00:00.000Z";

describe("validación tolerante: un dato malo de 1.0 nunca detiene la carga", () => {
  it("vacía el campo inválido y conserva la fila, con advertencia sin valores", () => {
    const d = validarDatos({ accounts: [{ id: "a1", name: "Persona Secreta", rut: 5, createdAt: T, updatedAt: T }] });
    expect(d.accounts).toHaveLength(1);
    expect(d.accounts[0]?.rut).toBeUndefined();
    expect(d.advertencias).toEqual([{ codigo: "campo_vaciado", recurso: "accounts", idOpai1: "a1", campo: "rut" }]);
    expect(JSON.stringify(d.advertencias)).not.toContain("Persona Secreta");
  });

  it("descarta la fila irrecuperable (sin id o sin campo obligatorio) y sigue con las demás", () => {
    const d = validarDatos({ accounts: [{ name: "sin id" }, 7, { id: "ok", name: "Cuenta", createdAt: T, updatedAt: T }] });
    expect(d.accounts.map((a) => a.id)).toEqual(["ok"]);
    expect(d.advertencias.filter((a) => a.codigo === "fila_descartada")).toHaveLength(2);
  });

  it("un elemento malo de una lista se descarta sin perder los demás", () => {
    const ahora = "2026-11-01T09:00:00.000Z";
    const d = validarDatos({
      recurringInvoiceSchedules: [
        {
          id: "r1",
          createdAt: ahora,
          updatedAt: ahora,
          lines: [{ itemName: "bueno", unitPrice: 100 }, { itemName: "malo", unitPrice: "abc" }],
        },
      ],
    });
    expect(d.recurringInvoiceSchedules[0]?.lines).toHaveLength(1);
    expect(d.advertencias[0]).toMatchObject({ recurso: "recurringInvoiceSchedules", idOpai1: "r1" });
    expect(d.advertencias[0]?.campo).toContain("lines[1]");
  });
});

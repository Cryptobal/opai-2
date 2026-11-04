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

  it("una cantidad inválida descarta la plantilla recurrente completa (no inventa cantidad 1)", () => {
    const ahora = "2026-11-01T09:00:00.000Z";
    const d = validarDatos({
      recurringInvoiceSchedules: [
        { id: "r1", createdAt: ahora, updatedAt: ahora, lines: [{ itemName: "malo", quantity: "abc", unitPrice: 100 }] },
        { id: "r2", createdAt: ahora, updatedAt: ahora, lines: [{ itemName: "bueno", quantity: 2, unitPrice: 100 }] },
      ],
    });
    expect(d.recurringInvoiceSchedules.map((r) => r.id)).toEqual(["r2"]);
    expect(d.advertencias).toContainEqual({
      codigo: "fila_descartada",
      recurso: "recurringInvoiceSchedules",
      idOpai1: "r1",
      campo: "lines",
    });
  });

  it("un campo con valor por defecto inválido (moneda, frecuencia, día) descarta la fila, no lo inventa", () => {
    const ahora = "2026-11-01T09:00:00.000Z";
    const d = validarDatos({
      recurringInvoiceSchedules: [{ id: "r3", createdAt: ahora, updatedAt: ahora, dayOfMonth: "x", lines: [] }],
    });
    expect(d.recurringInvoiceSchedules).toEqual([]);
    expect(d.advertencias[0]).toMatchObject({ codigo: "fila_descartada", campo: "dayOfMonth" });
  });
});

import { describe, expect, it } from "vitest";

import { contactoOpai1, programacionRecurrenteOpai1 } from "../../scripts/importar-opai1/origen";
import { destinatariosRecurrenteOpai1 } from "../../scripts/importar-opai1/recurrentes";

describe("destinatarios recurrentes 1.0", () => {
  it("une recipientContactIds con contactos recibeFacturacion de la cuenta", () => {
    const fila = programacionRecurrenteOpai1.parse({
      id: "rec-1",
      crmAccountId: "acc-1",
      recipientContactIds: ["c-explicit"],
      createdAt: "2025-01-01T12:00:00.000Z",
      updatedAt: "2025-01-01T12:00:00.000Z",
    });
    const contactos = [
      contactoOpai1.parse({
        id: "c-explicit",
        accountId: "acc-1",
        firstName: "A",
        createdAt: "2025-01-01T12:00:00.000Z",
        updatedAt: "2025-01-01T12:00:00.000Z",
      }),
      contactoOpai1.parse({
        id: "c-flag",
        accountId: "acc-1",
        firstName: "B",
        recibeFacturacion: true,
        createdAt: "2025-01-01T12:00:00.000Z",
        updatedAt: "2025-01-01T12:00:00.000Z",
      }),
      contactoOpai1.parse({
        id: "c-otra-cuenta",
        accountId: "acc-2",
        firstName: "C",
        recibeFacturacion: true,
        createdAt: "2025-01-01T12:00:00.000Z",
        updatedAt: "2025-01-01T12:00:00.000Z",
      }),
    ];
    expect(destinatariosRecurrenteOpai1(fila, contactos)).toEqual(["c-explicit", "c-flag"]);
  });
});

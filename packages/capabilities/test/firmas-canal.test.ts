import { describe, expect, it } from "vitest";

import { firmanteInputSchema, validarFirmantes } from "../src/core/firmas/enviar-util";

const trabajador = {
  tipo: "trabajador",
  personaId: "11111111-1111-4111-8111-111111111111",
  nombre: "Ana Portal",
  rol: "firma",
} as const;

describe("firmas: canal de envío del trabajador (R12, CAR-634)", () => {
  it("rechaza el fixture sin canal aunque tenga persona vinculada", () => {
    const firmante = firmanteInputSchema.parse(trabajador);
    expect(() => validarFirmantes([firmante])).toThrow("no tiene correo ni teléfono");
  });

  it("acepta el canal ficticio sin cambiar el tipo trabajador", () => {
    const firmante = firmanteInputSchema.parse({ ...trabajador, email: "ana-portal@example.test" });
    expect(firmante.tipo).toBe("trabajador");
    expect(() => validarFirmantes([firmante])).not.toThrow();
  });
});

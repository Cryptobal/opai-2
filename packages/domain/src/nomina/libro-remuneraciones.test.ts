import { describe, expect, it } from "vitest";

import { filaLibroRemuneraciones } from "./libro-remuneraciones";
import { filaLre } from "./lre";

const base = {
  personaId: "p1",
  rut: "12345678-5",
  nombre: "Ana Test",
  inicioContrato: "2025-01-01",
  terminoContrato: null as string | null,
  diasTrabajados: 30,
  diasLicencia: 2,
  haberes: [
    { concepto: "Sueldo base", monto: 600_000 },
    { concepto: "Colación", monto: 50_000 },
  ],
  descuentosLegales: [{ concepto: "AFP", monto: 80_000 }],
  otrosDescuentos: [{ concepto: "Anticipos", monto: 100_000 }],
  aportesEmpleador: [{ concepto: "SIS", monto: 11_000 }],
  liquido: 470_000,
};

describe("filaLibroRemuneraciones", () => {
  it("cuadra imponible, no imponible y líquido con el LRE", () => {
    const libro = filaLibroRemuneraciones(base);
    const lre = filaLre(base);
    expect(libro.haberesImponibles).toBe(lre.valores.get(5210));
    expect(libro.haberesNoImponibles).toBe(lre.valores.get(5230));
    expect(libro.descuentosLegales + libro.otrosDescuentos).toBe(lre.valores.get(5301));
    expect(libro.liquido).toBe(base.liquido);
  });
});
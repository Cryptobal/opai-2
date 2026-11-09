import { describe, expect, it } from "vitest";

import { cruzaMedianoche, totalPuestos, validarBorrador, type TramoBorrador } from "../lib/esquema-borrador";

const tramo = (o: Partial<TramoBorrador> = {}): TramoBorrador => ({
  clave: "a",
  nombre: "Día 4x4",
  patronId: "p1",
  horaInicio: "08:00",
  horaFin: "20:00",
  diasSemana: [1, 2, 3, 4, 5, 6, 7],
  posiciones: 2,
  ...o,
});
const opts = { nombresUsados: ["7x7 diurno"], ciclosVigentes: ["p1"] };

describe("borrador de esquema de cobertura", () => {
  it("suma los puestos de los tramos y detecta el cruce de medianoche", () => {
    expect(totalPuestos([tramo(), tramo({ posiciones: 2 })])).toBe(4);
    expect(cruzaMedianoche("20:00", "08:00")).toBe(true);
    expect(cruzaMedianoche("08:00", "20:00")).toBe(false);
  });
  it("acepta un esquema válido como 24/7", () => {
    expect(validarBorrador("24/7", [tramo(), tramo({ horaInicio: "20:00", horaFin: "08:00" })], opts).ok).toBe(true);
  });
  it("marca nombre repetido, ciclo inexistente y tramo sin puestos", () => {
    const r = validarBorrador("7x7 Diurno", [tramo({ patronId: "x", posiciones: 0 })], opts);
    expect(r.ok).toBe(false);
    expect(r.errores.nombre).toMatch(/Ya hay/);
    expect(r.errores.tramos[0]?.patronId).toMatch(/no existe/);
    expect(r.errores.tramos[0]?.posiciones).toMatch(/al menos 1/);
  });
  it("exige al menos un tramo y un día", () => {
    expect(validarBorrador("Nuevo", [], opts).errores.general).toBeTruthy();
    expect(validarBorrador("Nuevo", [tramo({ diasSemana: [] })], opts).ok).toBe(false);
  });
});

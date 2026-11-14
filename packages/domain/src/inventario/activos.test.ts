import { describe, expect, it } from "vitest";

import { codigoNormalizado, transicionManualPermitida, validarValores, type CampoTipo } from ".";

const campos: CampoTipo[] = [
  { clave: "imei", etiqueta: "IMEI", tipo: "texto", obligatorio: true },
  { clave: "bateria", etiqueta: "Batería", tipo: "numero", obligatorio: false },
  { clave: "compra", etiqueta: "Compra", tipo: "fecha", obligatorio: false },
];

describe("inventario · activos (CAR-236)", () => {
  it("R10: el código se compara sin mayúsculas ni espacios de más", () => {
    expect(codigoNormalizado("  tel   01 ")).toBe("TEL 01");
  });

  it("R11: exige los obligatorios y limpia los vacíos", () => {
    expect(validarValores(campos, {})).toEqual({ ok: false, error: "Falta «IMEI»." });
    expect(validarValores(campos, { imei: " 123 ", bateria: "", compra: null })).toEqual({
      ok: true,
      valores: { imei: "123" },
    });
  });

  it("R11: valida número y fecha y rechaza campos ajenos", () => {
    expect(validarValores(campos, { imei: "1", bateria: "8,5" })).toEqual({
      ok: true,
      valores: { imei: "1", bateria: 8.5 },
    });
    expect(validarValores(campos, { imei: "1", bateria: "mucho" })).toMatchObject({ ok: false });
    expect(validarValores(campos, { imei: "1", compra: "31-12-2026" })).toMatchObject({ ok: false });
    expect(validarValores(campos, { imei: "1", color: "rojo" })).toMatchObject({ ok: false });
  });

  it("R12: «De baja» no vuelve; «Asignado» solo por entrega y devolución", () => {
    expect(transicionManualPermitida("disponible", "en_reparacion")).toBe(true);
    expect(transicionManualPermitida("en_reparacion", "disponible")).toBe(true);
    expect(transicionManualPermitida("disponible", "de_baja")).toBe(true);
    expect(transicionManualPermitida("de_baja", "disponible")).toBe(false);
    expect(transicionManualPermitida("disponible", "asignado")).toBe(false);
    expect(transicionManualPermitida("asignado", "de_baja")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { inputDteDesdeForm, validarFormDte } from "../app/(erp)/finanzas/configuracion-dte/_componentes/validar-dte";
import type { FormDte } from "../app/(erp)/finanzas/configuracion-dte/_componentes/use-form-dte";

const base: FormDte = {
  ambiente: "certificacion",
  rutEmisor: "76111222-8",
  acteco: "801000",
  emisionProveedor: "simpleapi",
  cesionProveedor: "",
  resolucionNumero: "0",
  resolucionFecha: "2024-04-22",
  umbral: "20",
  avisoCaf: "30",
  fechaCorte: "",
};
const vigente = { emisionProveedor: "simulado" as const, cesionProveedor: null };

describe("configuración DTE · formulario (CAR-240)", () => {
  it("SimpleAPI en certificación con resolución N° 0 y fecha es válido y envía 0, no vacío", () => {
    expect(validarFormDte(base)).toEqual({});
    const i = inputDteDesdeForm(base, vigente);
    expect(i.resolucionSiiNumero).toBe(0);
    expect(i.resolucionSiiFecha).toBe("2024-04-22");
    expect(i.emisionProveedor).toBe("simpleapi");
    expect(i.ambiente).toBe("certificacion");
  });
  it("marca el campo cuando SimpleAPI no trae número o fecha", () => {
    const e = validarFormDte({ ...base, resolucionNumero: "", resolucionFecha: "" });
    expect(e.resolucionNumero).toMatch(/certificación es 0/);
    expect(e.resolucionFecha).toMatch(/fecha/);
  });
  it("el 0 no vale en producción y un número raro se marca", () => {
    expect(validarFormDte({ ...base, ambiente: "produccion" }).resolucionNumero).toMatch(/producción/);
    expect(validarFormDte({ ...base, resolucionNumero: "1a" }).resolucionNumero).toMatch(/números/);
    expect(validarFormDte({ ...base, umbral: "0", avisoCaf: "400" })).toMatchObject({ umbral: expect.any(String), avisoCaf: expect.any(String) });
  });
  it("ACTECO (CAR-240): SimpleAPI lo exige, se valida como código del SII y viaja como número o null", () => {
    expect(inputDteDesdeForm(base, vigente).acteco).toBe(801000);
    expect(validarFormDte({ ...base, acteco: "" }).acteco).toMatch(/SimpleAPI requiere el ACTECO/);
    expect(validarFormDte({ ...base, acteco: "80a" }).acteco).toMatch(/6 dígitos/);
    expect(validarFormDte({ ...base, acteco: "0" }).acteco).toMatch(/6 dígitos/);
    const simulado = { ...base, emisionProveedor: "simulado" as const, acteco: " " };
    expect(validarFormDte(simulado).acteco).toBeUndefined();
    expect(inputDteDesdeForm(simulado, vigente).acteco).toBeNull();
  });
  it("los conectores solo viajan si cambiaron (cambiarlos exige owner)", () => {
    const sinCambio = inputDteDesdeForm(base, { emisionProveedor: "simpleapi", cesionProveedor: null });
    expect(sinCambio).not.toHaveProperty("emisionProveedor");
    expect(sinCambio).not.toHaveProperty("cesionProveedor");
    expect(inputDteDesdeForm({ ...base, cesionProveedor: "octava" }, vigente).cesionProveedor).toBe("octava");
  });
});

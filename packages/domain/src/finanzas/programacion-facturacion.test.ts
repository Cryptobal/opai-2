import { describe, expect, it } from "vitest";

import { fechaFacturaProyectada, mesYAnio } from "./programacion-facturacion";

const base = { diasFacturacion: null, momento: "AL_EMITIR", diaFijo: null, mesRelativo: "MES_SIGUIENTE" };

describe("fecha proyectada de la factura", () => {
  it("sin nada más, la factura se proyecta el mismo día que el borrador", () => {
    expect(fechaFacturaProyectada("2026-11-05", base)).toEqual({ fecha: "2026-11-05", regla: "al_generar" });
  });
  it("día fijo del mes siguiente, con el último día cuando el mes es más corto", () => {
    const p = { ...base, momento: "DIA_FIJO", diaFijo: 31 };
    expect(fechaFacturaProyectada("2026-01-20", p).fecha).toBe("2026-02-28");
    expect(fechaFacturaProyectada("2026-12-05", { ...p, diaFijo: 10 }).fecha).toBe("2027-01-10");
    expect(fechaFacturaProyectada("2026-11-05", { ...p, diaFijo: -1, mesRelativo: "MES_ACTUAL" }).fecha).toBe("2026-11-30");
  });
  it("diasFacturacion prevalece sobre el momento configurado, de 0 a 120", () => {
    const p = { ...base, momento: "DIA_FIJO", diaFijo: 10, diasFacturacion: 15 };
    expect(fechaFacturaProyectada("2026-11-05", p)).toEqual({ fecha: "2026-11-20", regla: "dias_facturacion" });
    expect(fechaFacturaProyectada("2026-11-05", { ...p, diasFacturacion: 0 }).fecha).toBe("2026-11-05");
    expect(fechaFacturaProyectada("2026-11-05", { ...p, diasFacturacion: 120 }).fecha).toBe("2027-03-05");
  });
  it("un diasFacturacion fuera de rango no se usa", () => {
    expect(fechaFacturaProyectada("2026-11-05", { ...base, diasFacturacion: 121 }).regla).toBe("al_generar");
  });
  it("un momento desconocido cae en «al generar»", () => {
    expect(fechaFacturaProyectada("2026-11-05", { ...base, momento: "OTRO", diaFijo: 3 }).regla).toBe("al_generar");
  });
  it("mes y año del asunto", () => {
    expect(mesYAnio("2026-11-30")).toEqual({ mes: "Noviembre", anio: "2026" });
  });
});

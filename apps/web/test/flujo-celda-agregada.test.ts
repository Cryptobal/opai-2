import { describe, expect, it } from "vitest";

import { celdaAgregada } from "@/app/(erp)/finanzas/flujo/_componentes/celda-agregada";
import { parsearMontoUi } from "@/app/(erp)/finanzas/flujo/_componentes/monto-ui";

const c = (id: string, monto: number, capa: "plan" | "real" | "comprometido" = "real") => ({
  id,
  filaId: "f1",
  semana: "2026-10-26",
  capa,
  monto,
  nota: null,
});

describe("celdaAgregada", () => {
  it("suma los movimientos reales de la semana pasada", () => {
    const r = celdaAgregada([c("a", 400_000), c("b", 600_000)], "f1", "2026-10-26", true);
    expect(r?.monto).toBe(1_000_000);
    expect(r?.capa).toBe("real");
  });
  it("el plan pasado sin cartola no es la cifra principal", () => {
    const r = celdaAgregada([c("p", 500_000, "plan")], "f1", "2026-10-26", true);
    expect(r?.soloPlanSinRespaldo).toBe(true);
  });
  it("devuelve null si no hay celdas", () => {
    expect(celdaAgregada([], "f1", "2026-10-26", false)).toBeNull();
  });
});

describe("parsearMontoUi", () => {
  it("interpreta punto de miles chileno", () => {
    expect(parsearMontoUi("1.234")).toEqual({ ok: true, monto: 1234 });
    expect(parsearMontoUi("1234")).toEqual({ ok: true, monto: 1234 });
  });
  it("rechaza coma, decimales y letras", () => {
    expect(parsearMontoUi("1,234").ok).toBe(false);
    expect(parsearMontoUi("12abc").ok).toBe(false);
    expect(parsearMontoUi("").ok).toBe(false);
  });
});

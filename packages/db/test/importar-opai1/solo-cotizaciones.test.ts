import { describe, expect, it } from "vitest";

import { decision } from "../../scripts/importar-opai1/comun";
import type { DatosCotizacion } from "../../scripts/importar-opai1/cotizaciones-tipos";
import { calcularPlan } from "../../scripts/importar-opai1/plan";
import { soloCotizaciones } from "../../scripts/importar-opai1/plan-solo-cotizaciones";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { fixture } from "./memoria";

const cot = (negocio: string): DatosCotizacion => ({
  codigo: `C-${negocio}`, negocioIdOpai1: negocio, titulo: "T", estado: "borrador", moneda: "UF",
  validaHasta: null, enviadaEn: null, ventaMensualClp: null, margenModo: "margen_sobre_venta", meses: null,
  instalacionIdOpai1: null, creadaEn: "2026-01-01T00:00:00.000Z", vigente: false, lineas: [],
});

describe("modo solo cotizaciones (CAR-326)", () => {
  it("no crea ni completa nada más y omite las cotizaciones de negocios que no están en 2.0", () => {
    const base = calcularPlan(fixture(), estadoVacio(), { modulosActivos: [] });
    const plan = soloCotizaciones({
      ...base,
      negocios: [
        decision("negocio", "d-ya", "sin_cambios", { destinoId: "n-1" }),
        decision("negocio", "d-nuevo", "crear"),
      ],
      cotizaciones: [
        decision("cotizacion", "q-ok", "crear", { datos: cot("d-ya") }),
        decision("cotizacion", "q-no", "crear", { datos: cot("d-nuevo") }),
      ],
    });
    expect(plan.cuentas.every((d) => d.accion === "sin_cambios")).toBe(true);
    expect(plan.contactos.every((d) => d.accion === "sin_cambios")).toBe(true);
    expect(plan.instalaciones.every((d) => d.accion === "sin_cambios")).toBe(true);
    expect(plan.programaciones).toEqual([]);
    expect(plan.negocios.map((d) => d.idOpai1)).toEqual(["d-ya"]);
    expect(plan.cotizaciones.map((d) => [d.idOpai1, d.accion, d.motivo])).toEqual([
      ["q-ok", "crear", null],
      ["q-no", "omitido", "negocio_no_importado"],
    ]);
    expect(plan.comercial.cotizaciones).toBe(plan.cotizaciones);
  });
});

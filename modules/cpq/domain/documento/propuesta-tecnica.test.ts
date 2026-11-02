import { describe, expect, it } from "vitest";

import type { BasePlantilla } from "./bloques";
import {
  aperturaEfectiva,
  basePropuestaDesdeCotizacion,
  cotizacionServicioCambio,
  exigirDestinatariosEnvio,
  huellaServicioCotizacion,
  normalizarDestinatariosEnvio,
  proyectarResumenEconomico,
  type ServicioDesdeCotizacion,
} from "./propuesta-tecnica";

describe("propuesta técnica dominio (CAR-144)", () => {
  it("hereda la base de la cotización por defecto", () => {
    expect(basePropuestaDesdeCotizacion("ejecutiva" as BasePlantilla, null)).toBe("ejecutiva");
    expect(basePropuestaDesdeCotizacion("clasica" as BasePlantilla, "compacta" as BasePlantilla)).toBe(
      "compacta",
    );
  });

  it("limita la apertura a la máxima de plantilla", () => {
    expect(aperturaEfectiva("por_instalacion", "por_item")).toBe("por_instalacion");
    expect(aperturaEfectiva("por_item", "por_categoria")).toBe("por_categoria");
    expect(aperturaEfectiva("por_item", "por_item")).toBe("por_item");
  });

  it("coloca gastos generales y utilidad en una sola línea al final con apertura por ítem", () => {
    const r = proyectarResumenEconomico({
      apertura: "por_item",
      secciones: [{ nombre: "Torre A", netoMensualClp: 100_000 }],
      netoTotalClp: 100_000,
      gastosGeneralesYUtilidadClp: 12_000,
    });
    expect(r.gastosGeneralesYUtilidadClp).toBe(12_000);
    expect(r.ivaClp).toBe(21_280);
    expect(r.totalClp).toBe(133_280);
  });

  it("aplica tasa IVA del tenant distinta de 19 %", () => {
    const r = proyectarResumenEconomico({
      apertura: "por_item",
      secciones: [{ nombre: "Torre A", netoMensualClp: 100_000 }],
      netoTotalClp: 100_000,
      gastosGeneralesYUtilidadClp: 10_000,
      tasaIvaPct: 180_000,
    });
    expect(r.ivaClp).toBe(19_800);
    expect(r.totalClp).toBe(129_800);
  });

  it("no expone línea GG+utilidad con apertura por instalación", () => {
    const r = proyectarResumenEconomico({
      apertura: "por_instalacion",
      secciones: [{ nombre: "Torre A", netoMensualClp: 50_000 }],
      netoTotalClp: 50_000,
      gastosGeneralesYUtilidadClp: 9_000,
    });
    expect(r.gastosGeneralesYUtilidadClp).toBeNull();
  });

  it("valida y deduplica destinatarios", () => {
    const norm = normalizarDestinatariosEnvio([
      { email: " Ana@test.cl ", contactoId: "c1" },
      { email: "ana@test.cl" },
      { email: "invalido" },
    ]);
    expect(norm).toEqual([{ email: "ana@test.cl", contactoId: "c1" }]);
    expect(() => exigirDestinatariosEnvio([])).toThrow("DESTINATARIOS_VACIOS");
  });

  it("detecta cambio en el detalle de servicio de la cotización", () => {
    const servicio: ServicioDesdeCotizacion = {
      codigo: "CPQ-2026-014",
      versionNumero: 2,
      secciones: [
        {
          nombre: "Planta demo",
          puestos: [
            {
              nombre: "Guardia",
              posiciones: 1,
              patron: "4x4",
              horaInicio: "08:00",
              horaFin: "20:00",
              diasCobertura: 5,
            },
          ],
        },
      ],
    };
    const huella = huellaServicioCotizacion(servicio);
    expect(cotizacionServicioCambio(huella, servicio)).toBe(false);
    expect(
      cotizacionServicioCambio(huella, {
        ...servicio,
        secciones: [
          {
            ...servicio.secciones[0]!,
            puestos: [{ ...servicio.secciones[0]!.puestos[0]!, posiciones: 2 }],
          },
        ],
      }),
    ).toBe(true);
  });
});

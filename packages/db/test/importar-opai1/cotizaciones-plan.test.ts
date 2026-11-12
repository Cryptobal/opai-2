import { describe, expect, it } from "vitest";

import { diasDePuesto, estadoDeVersion, planCotizacionesCpq } from "../../scripts/importar-opai1/cotizaciones-plan";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { cotizacionOpai1 } from "../../scripts/importar-opai1/origen-cotizaciones";

const cot = (extra: Record<string, unknown>) =>
  cotizacionOpai1.parse({
    id: "q1",
    code: "CPQ-2026-001",
    createdAt: "2026-03-01T12:00:00.000Z",
    dealId: "d1",
    status: "sent",
    currency: "UF",
    parameters: { salePriceMonthly: "1250000.4", contractMonths: 12, marginMode: "markup" },
    positions: [
      { id: "p2", customName: "Nocturno", weekdays: ["Lun", "mar", "Fer"], numPuestos: 2, baseSalary: "600000", healthSystem: "Fonasa", displayOrder: 2 },
      { id: "p1", puestoTrabajo: { name: "Guardia" }, weekdays: ["viernes"], displayOrder: 1 },
    ],
    ...extra,
  });

const si = (id: string | null | undefined) => (id ? `n-${id}` : null);

describe("plan de cotizaciones desde 1.0 (CAR-326)", () => {
  it("traduce estados, días y líneas sin recalcular", () => {
    expect(estadoDeVersion("APPROVED")).toBe("aceptada");
    expect(estadoDeVersion("viewed")).toBe("enviada");
    expect(estadoDeVersion("rejected")).toBe("rechazada");
    expect(estadoDeVersion("draft")).toBe("borrador");
    expect(diasDePuesto(["Lun", "mar", "Fer", "domingo"])).toEqual([1, 2, 7]);

    const { decisiones } = planCotizacionesCpq([cot({})], estadoVacio(), si, si);
    const d = decisiones[0]!;
    expect(d.accion).toBe("crear");
    expect(d.datos).toMatchObject({
      codigo: "CPQ-2026-001", estado: "enviada", moneda: "UF", ventaMensualClp: 1250000, meses: 12,
      margenModo: "markup", vigente: true,
    });
    expect(d.datos!.lineas.map((l) => l.nombre)).toEqual(["Guardia", "Nocturno"]);
    expect(d.datos!.lineas[1]).toMatchObject({ posiciones: 2, diasSemana: [1, 2], saludTipo: "fonasa", sueldoBaseClp: 600000 });
  });

  it("omite sin negocio o con negocio no importado", () => {
    const { decisiones } = planCotizacionesCpq(
      [cot({ id: "a", dealId: null }), cot({ id: "b", dealId: "zz" })],
      estadoVacio(),
      (x) => (x === "zz" ? null : si(x)),
      si,
    );
    expect(decisiones.map((d) => [d.accion, d.motivo])).toEqual([
      ["omitido", "sin_negocio"],
      ["omitido", "negocio_no_importado"],
    ]);
  });

  it("deja una sola vigente por negocio: la ganada manda sobre la más nueva", () => {
    const { decisiones } = planCotizacionesCpq(
      [
        cot({ id: "a", code: "A", status: "approved", createdAt: "2026-01-01T00:00:00.000Z" }),
        cot({ id: "b", code: "B", status: "sent", createdAt: "2026-05-01T00:00:00.000Z" }),
        cot({ id: "c", code: "C", status: "rejected", createdAt: "2026-06-01T00:00:00.000Z" }),
      ],
      estadoVacio(),
      si,
      si,
    );
    const vigentes = decisiones.filter((d) => d.datos?.vigente).map((d) => d.idOpai1);
    expect(vigentes).toEqual(["a"]);
  });

  it("avisa lo que 2.0 no modela y la venta mensual faltante", () => {
    const { avisos } = planCotizacionesCpq(
      [cot({ parameters: {}, meals: [{}], vehicles: [{}] })],
      estadoVacio(),
      si,
      si,
    );
    expect(avisos.map((a) => a.codigo).sort()).toEqual(["cotizacion_con_costos_sin_modelo", "cotizacion_sin_venta_mensual"]);
  });

  it("una cotización ya importada queda sin cambios", () => {
    const destino = estadoVacio();
    destino.ids.push({ entidadTipo: "cotizacion", idExterno: "q1", entidadId: "x-1" });
    const { decisiones } = planCotizacionesCpq([cot({})], destino, si, si);
    expect(decisiones[0]).toMatchObject({ accion: "sin_cambios", destinoId: "x-1" });
  });
});

import { describe, expect, it } from "vitest";

import {
  MOTIVO_MODULO_COMERCIAL_INACTIVO,
  MOTIVO_MODULO_FINANZAS_INACTIVO,
  pendientesImportacion,
} from "../../scripts/importar-opai1/comercial-pendiente";
import { calcularPlan } from "../../scripts/importar-opai1/plan";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { programacionRecurrenteOpai1 } from "../../scripts/importar-opai1/origen";
import { fixture } from "./memoria";

function scheduleRecurrente(partial: { id: string; crmAccountId: string; lines: { description: string; unitPrice: number }[] }) {
  return programacionRecurrenteOpai1.parse({
    createdAt: "2025-01-01T12:00:00.000Z",
    updatedAt: "2025-01-01T12:00:00.000Z",
    ...partial,
  });
}

describe("plan según módulos del tenant", () => {
  it("sin módulos: CRM y recurrentes quedan pendientes (no se asume Finanzas ni Comercial)", () => {
    const plan = calcularPlan(fixture(), estadoVacio());
    expect(plan.opciones.modulosActivos).toEqual([]);
    expect(plan.pendientes).toContainEqual({
      entidad: "negocio",
      filas: 1,
      motivo: MOTIVO_MODULO_COMERCIAL_INACTIVO,
    });
  });

  it("con Comercial activo: negocios entran al plan (no pendiente_crm)", () => {
    const plan = calcularPlan(fixture(), estadoVacio(), { modulosActivos: ["comercial"] });
    expect(plan.pendientes.find((p) => p.motivo === "pendiente_crm_pr1")).toBeUndefined();
    expect(plan.comercial.etapas.filter((e) => e.accion === "crear").length).toBe(3);
    expect(plan.comercial.negocios.filter((n) => n.accion === "crear").length).toBe(1);
    expect(plan.comercial.historial.filter((h) => h.accion === "crear").length).toBe(2);
    expect(plan.comercial.contactosNegocio.filter((c) => c.accion === "crear").length).toBe(1);
  });

  it("cotizaciones: export incompleto en pendientes y omitidas en el plan", () => {
    const datos = {
      ...fixture(),
      cpqQuotes: [
        { id: "q-1", code: "CPQ-2025-001", createdAt: "2025-01-01T12:00:00.000Z" },
      ],
    };
    const plan = calcularPlan(datos, estadoVacio(), { modulosActivos: ["comercial", "cpq"] });
    expect(plan.pendientes).toContainEqual({
      entidad: "cotizacion",
      filas: 1,
      motivo: "export_cpq_incompleto",
    });
    expect(plan.comercial.cotizaciones).toEqual([
      expect.objectContaining({ idOpai1: "q-1", accion: "omitido", motivo: "export_cpq_incompleto" }),
    ]);
  });

  it("recurrentes: sin Finanzas queda pendiente; con Finanzas entra al plan", () => {
    const datos = {
      ...fixture(),
      recurringInvoiceSchedules: [
        scheduleRecurrente({
          id: "rec-1",
          crmAccountId: "acc-a1",
          lines: [{ description: "Servicio", unitPrice: 100_000 }],
        }),
      ],
    };
    expect(
      pendientesImportacion(datos, { modulosActivos: [] }).find(
        (p) => p.entidad === "programacion_factura_recurrente",
      ),
    ).toMatchObject({ filas: 1, motivo: MOTIVO_MODULO_FINANZAS_INACTIVO });

    expect(
      pendientesImportacion(datos, { modulosActivos: ["finanzas"] }).find(
        (p) => p.entidad === "programacion_factura_recurrente",
      ),
    ).toBeUndefined();

    const plan = calcularPlan(datos, estadoVacio(), { modulosActivos: ["finanzas"] });
    expect(plan.programaciones.length).toBe(1);
  });
});

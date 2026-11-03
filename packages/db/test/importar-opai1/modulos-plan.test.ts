import { describe, expect, it } from "vitest";

import {
  MOTIVO_MODULO_COMERCIAL_INACTIVO,
  MOTIVO_MODULO_FINANZAS_INACTIVO,
  MOTIVO_PENDIENTE_MODELO_PROGRAMACION,
  pendientesImportacion,
} from "../../scripts/importar-opai1/comercial-pendiente";
import { calcularPlan } from "../../scripts/importar-opai1/plan";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { fixture } from "./memoria";

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

  it("con Comercial activo ya no marca pendiente_crm_pr1", () => {
    const pendientes = pendientesImportacion(fixture(), { modulosActivos: ["comercial"] });
    expect(pendientes.some((p) => p.motivo === "pendiente_crm_pr1")).toBe(false);
  });

  it("recurrentes: sin Finanzas no se programan; con Finanzas falta modelo en 2.0", () => {
    const datos = {
      ...fixture(),
      recurringInvoiceSchedules: [
        {
          id: "rec-1",
          accountId: "acc-a1",
          createdAt: "2025-01-01T12:00:00.000Z",
          updatedAt: "2025-01-01T12:00:00.000Z",
        },
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
    ).toMatchObject({ filas: 1, motivo: MOTIVO_PENDIENTE_MODELO_PROGRAMACION });
  });
});

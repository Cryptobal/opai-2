// CAR-25 (B1) · La carga real escribe la forma de 1.0 con el rol sin BYPASSRLS: pausada, sin
// próxima ejecución, precio UF escalado, receptor congelado y destinatarios por correo.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { enTransaccion } from "../../src/transaccion";
import { aplicarPlanEnTransaccion } from "../../scripts/importar-opai1/aplicar";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { programacionRecurrenteOpai1 } from "../../scripts/importar-opai1/origen";
import { calcularPlan } from "../../scripts/importar-opai1/plan";
import { type Entorno, prepararEntorno, urlPropietario } from "../entorno";
import { fixture } from "./memoria";

const SELLO = { createdAt: "2025-01-01T12:00:00.000Z", updatedAt: "2025-01-01T12:00:00.000Z" };

describe.skipIf(!urlPropietario)("Carga de recurrentes de 1.0 (CAR-25)", () => {
  let e: Entorno;
  let tenantId = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `rec-${randomUUID().slice(0, 8)}`, nombre: "Rec", vertical: "seguridad" },
      })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("escribe UF, receptor congelado y correos; queda pausada y sin próxima ejecución", async () => {
    const filas = [
      programacionRecurrenteOpai1.parse({
        id: "rec-uf",
        crmAccountId: "acc-a6",
        currency: "UF",
        frequency: "weekly",
        dayOfWeek: 2,
        dayOfMonth: -1,
        active: true,
        nextRunAt: "2026-12-01T12:00:00.000Z",
        lastSuccessfulRun: { runAt: "2026-10-15T12:00:00.000Z" },
        receiverEmail: "pagos@ejemplo.cl",
        receiverEmailCc: ["cobranza@ejemplo.cl"],
        lines: [{ itemName: "Guardia", quantity: 2, unitPriceUf: 1.5, discountPct: 10 }],
        ...SELLO,
      }),
      programacionRecurrenteOpai1.parse({
        id: "rec-libre",
        crmAccountId: null,
        receiverRut: "11.111.111-1",
        receiverName: "Receptor Ficticio",
        lines: [{ description: "Servicio", unitPrice: 50_000, isExempt: true }],
        ...SELLO,
      }),
    ];
    const plan = calcularPlan({ ...fixture(), recurringInvoiceSchedules: filas }, estadoVacio(), {
      modulosActivos: ["finanzas"],
    });
    const r = await enTransaccion(tenantId, (tx) => aplicarPlanEnTransaccion(tx, tenantId, plan));
    expect(r.aplicadas.programaciones).toBe(2);

    const ps = await e.forTenant(tenantId).ventasProgramacion.findMany({
      include: { lineas: true, destinatarios: { orderBy: { orden: "asc" } } },
      orderBy: { nombre: "asc" },
    });
    const uf = ps.find((p) => p.moneda === "UF");
    const libre = ps.find((p) => p.cuentaId === null);
    expect(uf).toMatchObject({
      activa: false,
      proximaEjecucionEn: null,
      frecuencia: "semanal",
      diaSemana: 2,
      diaGeneracion: -1,
      ultimoPeriodo10: "2026-10",
    });
    expect(uf?.cuentaId).not.toBeNull();
    expect(uf?.lineas[0]).toMatchObject({
      precioUnitarioUf: 15_000n,
      precioUnitarioClp: null,
      descuentoPct: 1000,
    });
    expect(uf?.lineas[0]?.cantidad.toString()).toBe("2");
    expect(uf?.destinatarios.map((d) => [d.correo, d.tipo])).toEqual([
      ["pagos@ejemplo.cl", "para"],
      ["cobranza@ejemplo.cl", "cc"],
    ]);
    expect(libre).toMatchObject({ receptorRut: "11111111-1", receptorRazonSocial: "Receptor Ficticio" });
    expect(libre?.lineas[0]).toMatchObject({ precioUnitarioClp: 50_000n, exento: true });
  });
});

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { periodoDeMes } from "@opai/db";

import { prepararEntorno, urlPropietario, type Entorno } from "../../db/test/entorno";
import { medidorEnDb } from "../src/servicios-db";

// Decisión de Carlos del 12-nov-2026 (ADR-098): las apps conectadas por OAuth (Claude u otras)
// comparten el presupuesto mensual del agente de la empresa, igual que el agente interno.
describe.skipIf(!urlPropietario)("presupuesto de las apps OAuth con el medidor real", () => {
  let e: Entorno;
  let tenantId: string;
  const viaUserId = randomUUID();
  const consumo = (actorId: string) => ({
    tenantId,
    recurso: "capacidad.ejecucion",
    unidad: "ejecucion",
    cantidad: 1,
    modulo: "core",
    actorTipo: "agent" as const,
    actorId,
    viaUserId,
  });

  beforeAll(async () => {
    e = await prepararEntorno();
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: randomUUID(), nombre: "Apps OAuth ficticia", vertical: "seguridad" },
      })
    ).id;
    await e.admin.ajuste.create({
      data: {
        tenantId,
        ambito: "tenant",
        sujetoId: tenantId,
        modulo: "agente",
        clave: "presupuestoMensualMicro",
        valor: "1",
      },
    });
    await e.admin.gastoAgenteMes.create({
      data: {
        tenantId,
        agenteInternoId: "agente-interno",
        periodo: periodoDeMes(new Date()),
        topeMicro: 1n,
        gastadoMicro: 1n,
      },
    });
  }, 120_000);
  afterAll(async () => e?.cerrar());

  it("con el presupuesto del agente agotado, la app OAuth recibe BUDGET_EXCEEDED", async () => {
    await expect(medidorEnDb.registrar(consumo(`oauth:${randomUUID()}`))).rejects.toMatchObject({
      code: "BUDGET_EXCEEDED",
    });
    expect(await e.forTenant(tenantId).consumo.count()).toBe(0);
  });

  it("el agente interno sigue cobrando contra el mismo presupuesto", async () => {
    await expect(medidorEnDb.registrar(consumo(`agente-interno:${viaUserId}`))).rejects.toMatchObject(
      { code: "BUDGET_EXCEEDED" },
    );
  });
});

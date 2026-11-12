import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { consumirPresupuesto, esAgenteSinKey } from "../src/presupuesto";
import { enTransaccion } from "../src/transaccion";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("presupuesto atómico del agente interno sin API key", () => {
  let e: Entorno;
  let tenantId: string;
  let otro: string;
  const viaUserId = randomUUID();

  beforeAll(async () => {
    e = await prepararEntorno();
    const crear = async () =>
      (
        await e.admin.tenant.create({
          data: { slug: randomUUID(), nombre: "Agente interno ficticio", vertical: "seguridad" },
        })
      ).id;
    tenantId = await crear();
    otro = await crear();
    await e.forTenant(tenantId).ajuste.create({
      data: {
        tenantId,
        ambito: "tenant",
        sujetoId: tenantId,
        modulo: "agente",
        clave: "presupuestoMensualMicro",
        valor: "10",
      },
    });
  });
  afterAll(async () => e?.cerrar());

  it("20 cargos simultáneos aceptan 10 y avisan una sola vez al 80 %", async () => {
    const resultados = await Promise.all(
      Array.from({ length: 20 }, () =>
        enTransaccion(tenantId, (tx) =>
          consumirPresupuesto(tx, tenantId, null, 1n, {
            agenteInterno: { viaUserId },
          }),
        ),
      ),
    );
    expect(resultados.filter(Boolean)).toHaveLength(10);
    const fila = await e.forTenant(tenantId).gastoAgenteMes.findFirstOrThrow();
    expect(fila).toMatchObject({
      apiKeyId: null,
      agenteInternoId: "agente-interno",
      gastadoMicro: 10n,
    });
    expect(
      await e.forTenant(tenantId).evento.count({ where: { tipo: "core.agente.presupuesto_80" } }),
    ).toBe(1);
    expect(await e.forTenant(otro).gastoAgenteMes.count()).toBe(0);
  });

  it("las apps OAuth comparten el presupuesto del agente interno (decisión de Carlos, 12-nov-2026)", async () => {
    expect(esAgenteSinKey("oauth:cliente")).toBe(true);
    expect(esAgenteSinKey("agente-interno:u")).toBe(true);
    expect(esAgenteSinKey("key:x")).toBe(false);
    expect(esAgenteSinKey(null)).toBe(false);
    const t = (
      await e.admin.tenant.create({
        data: { slug: randomUUID(), nombre: "Apps OAuth ficticia", vertical: "seguridad" },
      })
    ).id;
    const base = {
      tenantId: t,
      recurso: "capacidad.ejecucion",
      cantidad: 1,
      unidad: "ejecucion",
      modulo: "core",
      actorTipo: "agent",
    };
    await e.forTenant(t).consumo.createMany({
      data: [
        { ...base, actorId: `oauth:${randomUUID()}`, viaUserId, costoTotalMicro: 7 },
        { ...base, actorId: `agente-interno:${viaUserId}`, viaUserId, costoTotalMicro: 2 },
      ],
    });
    await enTransaccion(t, (tx) =>
      consumirPresupuesto(tx, t, null, 1n, { agenteInterno: { viaUserId } }),
    );
    const fila = await e.forTenant(t).gastoAgenteMes.findFirstOrThrow();
    expect(fila).toMatchObject({ agenteInternoId: "agente-interno", gastadoMicro: 10n });
  });
});

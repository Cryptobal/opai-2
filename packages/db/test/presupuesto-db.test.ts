import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { consumirPresupuesto } from "../src/presupuesto";
import { enTransaccion } from "../src/transaccion";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("presupuesto atómico de la key", () => {
  let e: Entorno;
  let tenantId: string;
  let otroId: string;
  let apiKeyId: string;
  beforeAll(async () => {
    e = await prepararEntorno();
    const suffix = randomUUID();
    const tenant = await e.admin.tenant.create({
      data: { slug: `budget-${suffix}`, nombre: "Prueba", vertical: "seguridad" },
    });
    tenantId = tenant.id;
    otroId = (
      await e.admin.tenant.create({
        data: { slug: `budget-otro-${suffix}`, nombre: "Otra", vertical: "seguridad" },
      })
    ).id;
    const user = await e.admin.user.create({
      data: { name: "Prueba", email: `${suffix}@example.invalid` },
    });
    apiKeyId = (
      await e.admin.apiKey.create({
        data: {
          tenantId,
          userId: user.id,
          nombre: "Prueba",
          prefijo: "test",
          hash: suffix,
          scopes: ["core"],
          presupuestoMensualMicro: 10n,
        },
      })
    ).id;
  });
  afterAll(async () => e?.cerrar());

  it("20 cargos paralelos solo aceptan 10; avisa al 80 % exactamente una vez", async () => {
    const resultados = await Promise.all(
      Array.from({ length: 20 }, () =>
        enTransaccion(tenantId, async (tx) => {
          const ok = await consumirPresupuesto(tx, tenantId, apiKeyId, 1n);
          if (ok)
            await tx.consumo.create({
              data: {
                tenantId,
                apiKeyId,
                recurso: "prueba",
                unidad: "llamada",
                cantidad: 1,
                costoUnitarioMicro: 1,
                costoTotalMicro: 1,
                modulo: "core",
                actorTipo: "agent",
              },
            });
          return ok;
        }),
      ),
    );
    expect(resultados.filter(Boolean)).toHaveLength(10);
    expect(await e.forTenant(tenantId).consumo.count({ where: { apiKeyId } })).toBe(10);
    expect((await e.forTenant(tenantId).gastoAgenteMes.findFirstOrThrow()).gastadoMicro).toBe(10n);
    for (const umbral of [80, 100])
      expect(
        await e.forTenant(tenantId).evento.count({
          where: { entidadId: apiKeyId, tipo: `core.agente.presupuesto_${umbral}` },
        }),
      ).toBe(1);
  });
  it("otro tenant no lee ni carga gasto; una transacción fallida no consume", async () => {
    expect(await e.forTenant(otroId).gastoAgenteMes.count()).toBe(0);
    await expect(
      enTransaccion(otroId, (tx) => consumirPresupuesto(tx, otroId, apiKeyId, 1n)),
    ).rejects.toThrow();
    await expect(
      enTransaccion(tenantId, async (tx) => {
        await consumirPresupuesto(tx, tenantId, apiKeyId, 0n);
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect((await e.forTenant(tenantId).gastoAgenteMes.findFirstOrThrow()).gastadoMicro).toBe(10n);
  });

  it("yaIncurrido registra el gasto real aunque supere el tope; la siguiente llamada corta", async () => {
    // El tope ya está en 10 (gastado 10 por el test anterior): el proveedor ya cobró 5 más antes de
    // medirlos (IA, mapas, correo…). No puede perderse: se registra igual (BRIEF-02 §4.9).
    const ok = await enTransaccion(tenantId, (tx) =>
      consumirPresupuesto(tx, tenantId, apiKeyId, 5n, { yaIncurrido: true }),
    );
    expect(ok).toBe(true);
    expect((await e.forTenant(tenantId).gastoAgenteMes.findFirstOrThrow()).gastadoMicro).toBe(15n);
    // La siguiente llamada (prepago, no incurrida) sí corta: el tope ya está superado.
    const corta = await enTransaccion(tenantId, (tx) =>
      consumirPresupuesto(tx, tenantId, apiKeyId, 0n),
    );
    expect(corta).toBe(false);
    expect((await e.forTenant(tenantId).gastoAgenteMes.findFirstOrThrow()).gastadoMicro).toBe(15n);
  });

  it("subir el tope reinicia los avisos del período para que vuelvan a avisar", async () => {
    const otraKey = (
      await e.admin.apiKey.create({
        data: {
          tenantId,
          userId: (await e.admin.apiKey.findUniqueOrThrow({ where: { id: apiKeyId } })).userId,
          nombre: "Prueba 2",
          prefijo: "test2",
          hash: `${apiKeyId}-2`,
          scopes: ["core"],
          presupuestoMensualMicro: 10n,
        },
      })
    ).id;
    // Exactamente 80 % del tope inicial (10): avisa una vez, sin tocar el 100 %.
    await enTransaccion(tenantId, (tx) => consumirPresupuesto(tx, tenantId, otraKey, 8n));
    const aviso80 = async () =>
      e
        .forTenant(tenantId)
        .evento.count({ where: { entidadId: otraKey, tipo: "core.agente.presupuesto_80" } });
    expect(await aviso80()).toBe(1);
    await e.admin.apiKey.update({ where: { id: otraKey }, data: { presupuestoMensualMicro: 100n } });
    // Mismo período, tope nuevo: sin reiniciar los avisos, el 80 % quedaría marcado para siempre
    // bajo el tope viejo y nunca volvería a avisar al cruzar el 80 % del tope nuevo (gastado 80/100).
    await enTransaccion(tenantId, (tx) => consumirPresupuesto(tx, tenantId, otraKey, 72n));
    expect(await aviso80()).toBe(2);
    expect(
      (await e.forTenant(tenantId).gastoAgenteMes.findFirstOrThrow({ where: { apiKeyId: otraKey } }))
        .aviso80En,
    ).not.toBeNull();
  });
});

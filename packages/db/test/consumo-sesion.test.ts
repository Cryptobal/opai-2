import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararEntorno, urlPropietario, type Entorno } from "./entorno";
import { registrarConsumoSesion } from "../src/consumo-sesion";
import { registrarObservadorConsultas } from "../src/metricas";

describe.skipIf(!urlPropietario)("consumo humano con precio consolidado", () => {
  let e: Entorno;
  let tenantId: string;
  let otroTenant: string;
  const precios: string[] = [];
  beforeAll(async () => {
    e = await prepararEntorno();
    for (const otro of [false, true]) {
      const t = await e.admin.tenant.create({
        data: { slug: `consumo-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
      });
      if (otro) otroTenant = t.id;
      else tenantId = t.id;
    }
  });
  afterAll(async () => {
    registrarObservadorConsultas(null);
    if (e) {
      await e.admin.precioRecurso.deleteMany({ where: { id: { in: precios } } });
      await e.cerrar();
    }
  });

  it("guarda costo vigente, trazabilidad y UUIDv7 con una sola operación y aislamiento", async () => {
    for (const [fecha, costo] of [
      ["2026-10-27", 37],
      ["2999-01-01", 99],
    ] as const) {
      const p = await e.admin.precioRecurso.create({
        data: {
          recurso: "capacidad.ejecucion",
          unidad: "llamada",
          costoUnitarioMicro: costo,
          vigenteDesde: new Date(`${fecha}T00:00:00Z`),
        },
      });
      precios.push(p.id);
    }
    const capability = `prueba.${randomUUID()}`;
    let consultas = 0;
    registrarObservadorConsultas(() => consultas++);
    await registrarConsumoSesion({
      tenantId,
      recurso: "capacidad.ejecucion",
      unidad: "llamada",
      cantidad: 3,
      modulo: "core",
      capability,
      actorTipo: "user",
      actorId: "usuario-prueba",
      portal: "erp",
      efecto: "lectura",
      dryRun: false,
      ok: true,
      duracionMs: 12,
    });
    registrarObservadorConsultas(null);
    expect(consultas).toBe(1);
    const filas = await e.forTenant(tenantId).consumo.findMany({ where: { capability } });
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({
      costoUnitarioMicro: 37,
      costoTotalMicro: 111,
      actorId: "usuario-prueba",
      portal: "erp",
      ok: true,
      duracionMs: 12,
    });
    expect(filas[0]?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    expect(await e.forTenant(otroTenant).consumo.findMany({ where: { capability } })).toEqual([]);
    await registrarConsumoSesion(
      {
        tenantId,
        recurso: "capacidad.ejecucion",
        unidad: "llamada",
        cantidad: 2,
        modulo: "core",
        capability,
        actorTipo: "user",
        actorId: "sin-costo",
      },
      true,
    );
    expect(
      await e
        .forTenant(tenantId)
        .consumo.findFirst({ where: { capability, actorId: "sin-costo" } }),
    ).toMatchObject({ costoUnitarioMicro: 0, costoTotalMicro: 0 });
    await e.admin.precioRecurso.deleteMany({ where: { id: { in: precios } } });
    await registrarConsumoSesion({
      tenantId,
      recurso: "capacidad.ejecucion",
      unidad: "llamada",
      cantidad: 1,
      modulo: "core",
      capability,
      actorTipo: "user",
    });
    const sinPrecio = await e
      .forTenant(tenantId)
      .consumo.findMany({ where: { capability, actorId: null } });
    expect(sinPrecio[0]).toMatchObject({ costoUnitarioMicro: 0, costoTotalMicro: 0 });
  });

  it("no admite agentes ni keys en la ruta sin presupuesto", () => {
    expect(() =>
      registrarConsumoSesion({
        tenantId,
        recurso: "capacidad.ejecucion",
        unidad: "llamada",
        cantidad: 1,
        modulo: "core",
        actorTipo: "user",
        apiKeyId: randomUUID(),
      }),
    ).toThrow();
    expect(() =>
      registrarConsumoSesion({
        tenantId,
        recurso: "capacidad.ejecucion",
        unidad: "llamada",
        cantidad: 1,
        modulo: "core",
        actorTipo: "agent",
      }),
    ).toThrow();
  });
});

// Brief 14 · Rondas PR 1 (corrección, revisión 5705574663): aislamiento entre tenants del módulo
// Rondas contra Postgres real (si hay DATABASE_URL_TEST). La RLS `tenant_isolation` de las tablas
// `rondas.*` debe impedir que el owner de un tenant vea o use puntos y plantillas de otro, aun
// pasando el id directo. Complementa el alcance por filas en memoria (rondas.test.ts) y la cobertura
// de RLS del núcleo en packages/db.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("aislamiento entre tenants · Rondas (RLS)", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tenantA = "";
  let tenantB = "";
  let instA = "";
  let instB = "";
  let puntoB = "";
  let plantillaB = "";
  const medidor = { registrar: async () => undefined };

  const ctxOwner = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      modulosActivos: ["rondas"],
      medidor,
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesRondas]);

    const tenant = async (slug: string) =>
      (
        await e.admin.tenant.create({
          data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" },
        })
      ).id;
    tenantA = await tenant("rondas-a");
    tenantB = await tenant("rondas-b");
    const cuenta = async (tenantId: string) =>
      (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cuenta" } })).id;
    const inst = async (tenantId: string, cuentaId: string, nombre: string) =>
      (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre } })).id;
    instA = await inst(tenantA, await cuenta(tenantA), "Planta A");
    instB = await inst(tenantB, await cuenta(tenantB), "Planta B");
    puntoB = (
      await e.admin.puntoControl.create({
        data: { tenantId: tenantB, instalacionId: instB, nombre: "Portón B", modo: "qr_gps", latitud: -33.4, longitud: -70.6 },
      })
    ).id;
    plantillaB = (
      await e.admin.plantillaRonda.create({
        data: { tenantId: tenantB, instalacionId: instB, nombre: "Plantilla B", tiempoMaxMin: 60 },
      })
    ).id;
    await e.admin.plantillaPunto.create({
      data: { tenantId: tenantB, plantillaId: plantillaB, puntoId: puntoB, orden: 0 },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("el owner de B ve sus propios puntos (control)", async () => {
    const r = await mod.executeCapability(ctxOwner(tenantB), "rondas.puntos.listar", { instalacionId: instB });
    expect(r.ok && (r.data as unknown[]).length).toBe(1);
  });

  it("el owner de A no ve la instalación de B: listar puntos da NOT_FOUND", async () => {
    const r = await mod.executeCapability(ctxOwner(tenantA), "rondas.puntos.listar", { instalacionId: instB });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("el owner de A no lista las plantillas de B", async () => {
    const r = await mod.executeCapability(ctxOwner(tenantA), "rondas.plantillas.listar", { instalacionId: instB });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("el owner de A no puede armar una plantilla en su instalación con un punto de B", async () => {
    const r = await mod.executeCapability(ctxOwner(tenantA), "rondas.plantillas.crear", {
      instalacionId: instA,
      nombre: "Ronda con punto ajeno",
      tiempoMaxMin: 60,
      puntos: [{ puntoId: puntoB, orden: 0, obligatorio: true }],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("el owner de A no puede programar con una plantilla de B", async () => {
    const r = await mod.executeCapability(ctxOwner(tenantA), "rondas.programaciones.fijar", {
      instalacionId: instA,
      plantillaId: plantillaB,
      nombre: "Programación con plantilla ajena",
      horarios: ["08:00"],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

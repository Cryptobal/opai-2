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
  let plantillaA = "";
  let personaB = "";
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
    // Una plantilla válida en A, para fijar programaciones de A en los casos de abajo.
    const puntoA = (
      await e.admin.puntoControl.create({
        data: { tenantId: tenantA, instalacionId: instA, nombre: "Portón A", modo: "qr_gps", latitud: -33.4, longitud: -70.6 },
      })
    ).id;
    plantillaA = (
      await e.admin.plantillaRonda.create({
        data: { tenantId: tenantA, instalacionId: instA, nombre: "Plantilla A", tiempoMaxMin: 60 },
      })
    ).id;
    await e.admin.plantillaPunto.create({
      data: { tenantId: tenantA, plantillaId: plantillaA, puntoId: puntoA, orden: 0 },
    });
    // Una persona de B con vínculo vigente en B, para probar que A no la puede asignar (5c).
    const cargoB = (await e.admin.cargo.create({ data: { tenantId: tenantB, nombre: "Guardia" } })).id;
    personaB = (
      await e.admin.persona.create({
        data: { tenantId: tenantB, nombres: "Persona", apellidos: "B", rut: "22.222.222-2", estado: "activa" },
      })
    ).id;
    await e.admin.vinculoLaboral.create({
      data: { tenantId: tenantB, personaId: personaB, cargoId: cargoB, instalacionId: instB, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente" },
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

  // 5c: una persona de otro tenant no puede quedar como responsable en la programación de A. La RLS
  // impide leer la persona de B y el vínculo exige la instalación de A, así que responde NOT_FOUND
  // sin revelar que la persona existe en B (sin enumeración).
  it("el owner de A no puede asignar como responsable a una persona de B", async () => {
    const r = await mod.executeCapability(ctxOwner(tenantA), "rondas.programaciones.fijar", {
      instalacionId: instA,
      plantillaId: plantillaA,
      nombre: "Programación con persona ajena",
      horarios: ["08:00"],
      responsables: { modo: "personas", personaIds: [personaB] },
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  // 5a: dos ediciones concurrentes de la misma programación se serializan por el FOR UPDATE del
  // handler (chequeo y escritura en una sola transacción): ambas terminan sin error y la fila queda
  // con uno de los dos nombres, sin pérdida ni mezcla.
  it("dos fijar concurrentes sobre la misma programación se serializan sin perderse", async () => {
    const creada = await mod.executeCapability(ctxOwner(tenantA), "rondas.programaciones.fijar", {
      instalacionId: instA,
      plantillaId: plantillaA,
      nombre: "Programación A",
      horarios: ["08:00"],
    });
    const id = creada.ok ? (creada.data as { id: string }).id : "";
    const editar = (nombre: string) =>
      mod.executeCapability(ctxOwner(tenantA), "rondas.programaciones.fijar", {
        id,
        instalacionId: instA,
        plantillaId: plantillaA,
        nombre,
        horarios: ["09:00"],
      });
    const [a, b] = await Promise.all([editar("Edición uno"), editar("Edición dos")]);
    expect(a.ok && b.ok).toBe(true);
    const fin = await e.admin.programacion.findUnique({ where: { id }, select: { nombre: true } });
    expect(["Edición uno", "Edición dos"]).toContain(fin?.nombre);
  });
});

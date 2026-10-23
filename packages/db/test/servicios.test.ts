// Servicios del núcleo contra Postgres real (Brief 02): bitácora encadenada concurrente y su
// verificación, cola de trabajos sin doble reclamo y consolidación de consumos.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

import type * as DbModulo from "../src/index";

type Db = typeof DbModulo;

describe.skipIf(!urlPropietario)("servicios del núcleo en base real", () => {
  let e: Entorno;
  let tenantId = "";
  let db: Db;

  beforeAll(async () => {
    e = await prepararEntorno();
    db = await import("../src/index");
    const t = await e.admin.tenant.create({
      data: { slug: `serv-${randomUUID().slice(0, 8)}`, nombre: "S", vertical: "seguridad" },
    });
    tenantId = t.id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("la bitácora se encadena sin bifurcarse con hechos concurrentes y se verifica", async () => {
    const hechos = Array.from({ length: 8 }, (_, i) =>
      db.enTransaccion(tenantId, (tx) =>
        db.agregarABitacora(tx, tenantId, { tipo: "prueba", entidadId: String(i), payload: { i } }),
      ),
    );
    const seqs = (await Promise.all(hechos)).map((r) => r.seq).sort((a, b) => a - b);
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(await db.verificarBitacora(tenantId)).toEqual({
      ok: true,
      ultimoSeq: 8,
      primeraRota: null,
    });
  });

  it("dos runners concurrentes no reclaman el mismo trabajo y los fallos se reintentan", async () => {
    const t = db.forTenant(tenantId);
    await t.trabajo.createMany({
      data: Array.from({ length: 6 }, (_, i) => ({ tenantId, tipo: "prueba", payload: { i } })),
    });
    const cola = db.colaDeTrabajos(tenantId);
    const [a, b] = await Promise.all([cola.reclamar(4), cola.reclamar(4)]);
    const ids = [...a, ...b].map((x) => x.id);
    expect(ids.length).toBe(6);
    expect(new Set(ids).size).toBe(6);
    const primero = a[0] ?? b[0];
    if (!primero) throw new Error("sin trabajos");
    await cola.fallar(primero.id, "falla", new Date(Date.now() - 1000));
    const otra = await cola.reclamar(10);
    expect(otra.map((x) => x.id)).toEqual([primero.id]);
    expect(otra[0]?.intentos).toBe(2);
    await cola.completar(primero.id, { ok: true });
    expect((await t.trabajo.findUnique({ where: { id: primero.id } }))?.estado).toBe("hecho");
  });

  it("consolida consumos por día, recurso, módulo y key de forma idempotente", async () => {
    const t = db.forTenant(tenantId);
    const ayer = new Date(Date.now() - 86_400_000);
    const dia = ayer.toISOString().slice(0, 10);
    const base = {
      tenantId,
      modulo: "core",
      actorTipo: "user",
      unidad: "llamada",
      createdAt: ayer,
    };
    await t.consumo.createMany({
      data: [
        { ...base, recurso: "capacidad.ejecucion", cantidad: 1, costoTotalMicro: 0 },
        { ...base, recurso: "capacidad.ejecucion", cantidad: 1, costoTotalMicro: 0 },
        { ...base, recurso: "correo.enviado", cantidad: 3, costoTotalMicro: 1200 },
      ],
    });
    await db.consolidarConsumos(tenantId, dia);
    const r = await db.consolidarConsumos(tenantId, dia);
    expect(r.grupos).toBe(2);
    const filas = await t.consumoDiario.findMany({ orderBy: { recurso: "asc" } });
    expect(filas.map((f) => [f.recurso, f.cantidad, f.costoTotalMicro])).toEqual([
      ["capacidad.ejecucion", 2, 0n],
      ["correo.enviado", 3, 1200n],
    ]);
  });

  it("antes de purgar consolida los días vencidos que el cron no alcanzó", async () => {
    const t = db.forTenant(tenantId);
    const viejo = new Date(Date.now() - 120 * 86_400_000);
    const dia = viejo.toISOString().slice(0, 10);
    await t.consumo.create({
      data: {
        tenantId,
        modulo: "core",
        actorTipo: "system",
        unidad: "correo",
        recurso: "correo.enviado",
        cantidad: 7,
        costoTotalMicro: 2800,
        createdAt: viejo,
      },
    });
    const r = await db.consolidarConsumos(tenantId, new Date().toISOString().slice(0, 10));
    expect(r.purgadas).toBeGreaterThanOrEqual(1);
    expect(await t.consumo.count({ where: { createdAt: { lte: viejo } } })).toBe(0);
    const fila = await t.consumoDiario.findFirst({
      where: { dia: new Date(`${dia}T00:00:00.000Z`), recurso: "correo.enviado" },
    });
    expect([fila?.cantidad, fila?.costoTotalMicro]).toEqual([7, 2800n]);
  });
});

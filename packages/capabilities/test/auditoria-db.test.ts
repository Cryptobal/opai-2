// Auditoría atómica y encadenada (núcleo P0, bloque 4): contra Postgres real, con el rol
// equivalente a `opai_app` (sin BYPASSRLS). Auditoría del 26-oct-2026 pedida por Carlos (t457u).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("auditoría atómica y encadenada en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const nuevoTenant = async (slug: string) => (await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } })).id;
  const ctxDe = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });
  const crearCuenta = (tenantId: string, nombre: string) =>
    mod.executeCapability(ctxDe(tenantId), "core.cuentas.create", { nombre });

  it("escribe y audita en una sola transacción; un fallo del insert de auditoría revierte la escritura", async () => {
    const tenantId = await nuevoTenant(`aud-fallo-${randomUUID().slice(0, 8)}`);
    const antes = await e.admin.cuenta.count({ where: { tenantId } });
    // Fallo inyectado real (no mock): una restricción imposible en audit_events hace que CUALQUIER
    // insert de auditoría falle, dentro de la misma transacción que la escritura de negocio.
    await e.admin.$executeRawUnsafe(
      `ALTER TABLE "core"."audit_events" ADD CONSTRAINT falla_inyectada_test CHECK (1 = 0) NOT VALID`,
    );
    try {
      const r = await crearCuenta(tenantId, "Cuenta que no debe quedar");
      expect(r.ok).toBe(false);
    } finally {
      await e.admin.$executeRawUnsafe(`ALTER TABLE "core"."audit_events" DROP CONSTRAINT falla_inyectada_test`);
    }
    expect(await e.admin.cuenta.count({ where: { tenantId } })).toBe(antes);
    expect(await e.admin.auditEvent.count({ where: { tenantId } })).toBe(0);
  });

  it("un fallo del handler nunca llega a auditar", async () => {
    const tenantId = await nuevoTenant(`aud-handler-${randomUUID().slice(0, 8)}`);
    // Un RUT inválido hace que el handler lance antes de escribir (ver cuentas-escritura.ts).
    const r = await mod.executeCapability(ctxDe(tenantId), "core.cuentas.create", {
      nombre: "Con RUT inválido",
      rut: "no-es-un-rut",
    });
    expect(r.ok).toBe(false);
    expect(await e.admin.auditEvent.count({ where: { tenantId } })).toBe(0);
  });

  it("opai_app no puede UPDATE ni DELETE en audit_events (solo INSERT/SELECT)", async () => {
    const tenantId = await nuevoTenant(`aud-rls-${randomUUID().slice(0, 8)}`);
    await crearCuenta(tenantId, "Cuenta auditada");
    const fila = await e.admin.auditEvent.findFirstOrThrow({ where: { tenantId } });
    const db = e.forTenant(tenantId);
    await expect(db.auditEvent.update({ where: { id: fila.id }, data: { capability: "x" } })).rejects.toThrow();
    await expect(db.auditEvent.delete({ where: { id: fila.id } })).rejects.toThrow();
    expect(await e.admin.auditEvent.findUniqueOrThrow({ where: { id: fila.id } })).toMatchObject({
      capability: fila.capability,
    });
  });

  it("la cadena queda válida tras escrituras concurrentes, del mismo tenant y de dos tenants, sin cruces", async () => {
    const sufijo = randomUUID().slice(0, 8);
    const tenantA = await nuevoTenant(`aud-conc-a-${sufijo}`);
    const tenantB = await nuevoTenant(`aud-conc-b-${sufijo}`);
    const N = 8;
    await Promise.all(Array.from({ length: N }, (_, i) => crearCuenta(tenantA, `Cuenta A${i}`)));
    await Promise.all(Array.from({ length: N }, (_, i) => crearCuenta(tenantB, `Cuenta B${i}`)));
    const verA = await mod.executeCapability(ctxDe(tenantA), "core.auditoria.verificar", {});
    const verB = await mod.executeCapability(ctxDe(tenantB), "core.auditoria.verificar", {});
    expect(verA).toMatchObject({ ok: true, data: { ok: true, ultimoSeq: N, primeraRota: null } });
    expect(verB).toMatchObject({ ok: true, data: { ok: true, ultimoSeq: N, primeraRota: null } });
    // Sin cruces: las secuencias de cada tenant son 1..N sin huecos ni saltos del otro tenant.
    const secA = (await e.admin.auditEvent.findMany({ where: { tenantId: tenantA }, orderBy: { seq: "asc" } })).map((f) => f.seq);
    const secB = (await e.admin.auditEvent.findMany({ where: { tenantId: tenantB }, orderBy: { seq: "asc" } })).map((f) => f.seq);
    expect(secA).toEqual(Array.from({ length: N }, (_, i) => i + 1));
    expect(secB).toEqual(Array.from({ length: N }, (_, i) => i + 1));
  });

  it("una fila alterada por el rol dueño se detecta como rota", async () => {
    const tenantId = await nuevoTenant(`aud-rota-${randomUUID().slice(0, 8)}`);
    for (const n of ["Una", "Dos", "Tres"]) await crearCuenta(tenantId, n);
    expect(await mod.executeCapability(ctxDe(tenantId), "core.auditoria.verificar", {})).toMatchObject({
      ok: true,
      data: { ok: true, ultimoSeq: 3, primeraRota: null },
    });
    const filas = await e.admin.auditEvent.findMany({ where: { tenantId }, orderBy: { seq: "asc" } });
    // Solo el dueño puede escribir aquí (opai_app no tiene UPDATE): altera el eslabón 2.
    await e.admin.auditEvent.update({ where: { id: filas[1]!.id }, data: { hashCanon: '{"alterado":true}' } });
    expect(await mod.executeCapability(ctxDe(tenantId), "core.auditoria.verificar", {})).toMatchObject({
      ok: true,
      data: { ok: false, primeraRota: 2 },
    });
  });
});

import { salidaPanel } from "../src/core/maestros/estructuras-panel-schema";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registrarObservadorConsultas } from "@opai/db";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import {
  capacidadesDelNucleo,
  crearContexto,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";

describe.skipIf(!urlPropietario)("panel salarial consolidado con RLS real", () => {
  let e: Entorno;
  let tenantId: string;
  let otro: string;
  let personaId: string;
  const refs: { instalacionId: string; estructuraId: string }[] = [];
  const contexto = (tenant = tenantId) =>
    crearContexto({ tenantId: tenant, rol: "owner", actor: { tipo: "system" } });
  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarRegistro();
    registrarCapacidades(capacidadesDelNucleo);
    for (const n of [0, 1]) {
      const t = await e.admin.tenant.create({
        data: { slug: `panel-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
      });
      if (n === 0) tenantId = t.id;
      else otro = t.id;
    }
    const db = e.forTenant(tenantId);
    const c = await db.cuenta.create({ data: { tenantId, nombre: "Prueba" } });
    personaId = (
      await db.persona.create({
        data: { tenantId, nombres: "Ana", apellidos: "Prueba", rut: "12345678-5" },
      })
    ).id;
    for (const nombre of ["Norte", "Sur", "Centro"]) {
      const i = await db.instalacion.create({ data: { tenantId, cuentaId: c.id, nombre } });
      const s = await executeCapability(contexto(), "core.estructuras.create", {
        nivel: "instalacion",
        instalacionId: i.id,
        sueldoBase: 600000,
        colacion: 0,
        movilizacion: 0,
        gratificacion: "ninguna",
        vigenteDesde: "2026-01-01",
      });
      expect(s.ok).toBe(true);
      const estructura = await db.estructuraSueldo.findFirstOrThrow({
        where: { instalacionId: i.id },
      });
      refs.push({ instalacionId: i.id, estructuraId: estructura.id });
    }
  });
  afterAll(async () => {
    registrarObservadorConsultas(null);
    await e?.cerrar();
  });

  it("devuelve y audita cada referencia real sin superar ocho consultas", async () => {
    for (const ref of refs) {
      for (const tipo of ["persona", "instalacion"] as const) {
        let conteo = 0;
        registrarObservadorConsultas(() => {
          conteo++;
        });
        const r = await executeCapability(contexto(), "core.estructuras.panel", {
          tipo,
          id: tipo === "persona" ? personaId : ref.instalacionId,
          instalacionId: ref.instalacionId,
        });
        registrarObservadorConsultas(null);
        expect(r.ok).toBe(true);
        if (!r.ok) throw new Error(r.error.message);
        expect(conteo).toBeGreaterThan(0);
        expect(conteo).toBeLessThanOrEqual(8);
        const panel = salidaPanel.parse(r.data);
        expect(tipo === "persona" ? panel.efectiva?.estructura?.id : panel.versiones[0]?.id).toBe(
          ref.estructuraId,
        );
        const auditoria = await e.forTenant(tenantId).auditEvent.findMany({
          where: { capability: "core.estructuras.panel" },
          orderBy: { seq: "desc" },
          take: 1,
        });
        expect(auditoria[0]?.payload).toMatchObject({
          ids: expect.arrayContaining([ref.estructuraId, ref.instalacionId]),
        });
      }
    }
  });

  it("integra la banda con su permiso, nombres y auditoría; no revela aprobaciones sin permiso", async () => {
    const db = e.forTenant(tenantId);
    const user = await e.admin.user.create({
      data: {
        name: "Responsable de prueba",
        email: `panel-${randomUUID()}@example.invalid`,
      },
    });
    await db.membership.create({
      data: { tenantId, userId: user.id, rol: "owner", portales: ["erp"] },
    });
    const a = await db.aprobacion.create({
      data: {
        tenantId,
        viaUserId: user.id,
        agenteInternoId: "prueba",
        capability: "core.estructuras.anular",
        input: { id: refs[0]!.instalacionId },
        resumen: "Propuesta de prueba",
        venceEn: new Date("2999-01-01T00:00:00Z"),
      },
    });
    const input = { tipo: "instalacion", id: refs[0]!.instalacionId };
    const ctx = contexto();
    const r = await executeCapability(ctx, "core.estructuras.panel", input);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.error.message);
    expect(salidaPanel.parse(r.data).aprobaciones).toEqual([
      expect.objectContaining({
        id: a.id,
        agente: "Agente interno",
        via: "Responsable de prueba",
      }),
    ]);
    const audit = await db.auditEvent.findFirst({
      where: { capability: "core.estructuras.panel" },
      orderBy: { seq: "desc" },
    });
    expect(audit?.payload).toMatchObject({ ids: expect.arrayContaining([a.id]) });
    const sinPermiso = await executeCapability(
      { ...ctx, autorizar: (p) => p !== "core:aprobaciones.manage" },
      "core.estructuras.panel",
      input,
    );
    expect(sinPermiso.ok).toBe(true);
    if (!sinPermiso.ok) throw new Error(sinPermiso.error.message);
    expect(salidaPanel.parse(sinPermiso.data).aprobaciones).toEqual([]);
  });

  it("oculta montos y no registra revelación sin permiso sensible", async () => {
    const ctx = contexto();
    const antes = await e
      .forTenant(tenantId)
      .auditEvent.count({ where: { capability: "core.estructuras.read_sensible" } });
    const r = await executeCapability(
      { ...ctx, autorizar: (p) => p !== "core:estructuras.read_sensible" },
      "core.estructuras.panel",
      { tipo: "instalacion", id: refs[0]!.instalacionId },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.error.message);
    expect(salidaPanel.parse(r.data).versiones[0]).toMatchObject({
      sensible: true,
      sueldoBase: null,
    });
    expect(
      await e
        .forTenant(tenantId)
        .auditEvent.count({ where: { capability: "core.estructuras.read_sensible" } }),
    ).toBe(antes);
  });

  it("deniega otro tenant, falta de permisos y referencias fuera de alcance", async () => {
    const input = { tipo: "instalacion", id: refs[0]!.instalacionId };
    expect(await executeCapability(contexto(otro), "core.estructuras.panel", input)).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    const ctx = contexto();
    expect(
      await executeCapability(
        { ...ctx, autorizar: (p) => p !== "core:cuentas.read" },
        "core.estructuras.panel",
        input,
      ),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(
      await executeCapability(
        { ...ctx, alcance: { instalaciones: [] } },
        "core.estructuras.panel",
        input,
      ),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(
      await executeCapability(
        { ...ctx, alcance: { instalaciones: [refs[0]!.instalacionId] } },
        "core.estructuras.panel",
        { tipo: "persona", id: personaId },
      ),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

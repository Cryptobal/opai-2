import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { PLANTILLAS } from "../../db/scripts/roles-base-plantillas";
import * as mod from "../src";

describe.skipIf(!urlPropietario)("Inspector DT: RLS y auditoría persistida", () => {
  let e: Entorno;
  let tenantId: string;
  let otroId: string;
  let estructuraId: string;
  let personaId: string;
  const actorId = randomUUID();
  const permisosRol = PLANTILLAS.find((p) => p.nombre === "Inspector DT")!.permisos;
  const contexto = (id = tenantId, acotado = false) =>
    mod.crearContexto({
      tenantId: id,
      rol: "supervisor",
      permisosRol,
      actor: { tipo: "user", id: actorId },
      portal: "erp",
      portalesMembresia: ["erp"],
      alcance: acotado ? { instalaciones: [] } : null,
      medidor: { registrar: async () => undefined },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    tenantId = (
      await e.admin.tenant.create({
        data: {
          slug: `inspector-${randomUUID()}`,
          nombre: "Inspector test",
          vertical: "seguridad",
        },
      })
    ).id;
    otroId = (
      await e.admin.tenant.create({
        data: {
          slug: `inspector-${randomUUID()}`,
          nombre: "Otro test",
          vertical: "seguridad",
        },
      })
    ).id;
    const cargo = await e.forTenant(tenantId).cargo.create({
      data: {
        tenantId,
        nombre: "Sensible",
        sueldoSensible: true,
      },
    });
    personaId = (
      await e.forTenant(tenantId).persona.create({
        data: {
          tenantId,
          nombres: "Persona",
          apellidos: "Ficticia",
          rut: "12345678-5",
        },
      })
    ).id;
    estructuraId = (
      await e.forTenant(tenantId).estructuraSueldo.create({
        data: {
          tenantId,
          nivel: "persona",
          personaId,
          sueldoBase: 3_000_000,
          vigenteDesde: new Date("2026-01-01"),
        },
      })
    ).id;
    await e.forTenant(tenantId).vinculoLaboral.create({
      data: {
        tenantId,
        personaId,
        cargoId: cargo.id,
        tipo: "indefinido",
        inicio: new Date("2026-01-01"),
      },
    });
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("montos completos; cada get queda persistido con actor, fecha y estructura", async () => {
    for (let n = 0; n < 2; n++) {
      expect(
        await mod.executeCapability(contexto(), "core.estructuras.get", { id: estructuraId }),
      ).toMatchObject({ ok: true, data: { sueldoBase: 3_000_000, sensible: false } });
    }
    const eventos = await e.forTenant(tenantId).auditEvent.findMany({
      where: { capability: "core.estructuras.read_sensible", entityId: estructuraId },
    });
    expect(eventos).toHaveLength(2);
    for (const ev of eventos) {
      expect(ev.actorId).toBe(actorId);
      expect(ev.createdAt).toBeInstanceOf(Date);
      expect(ev.tenantId).toBe(tenantId);
    }
    expect(await e.forTenant(otroId).auditEvent.count({ where: { entityId: estructuraId } })).toBe(
      0,
    );
  });

  it("otro tenant o fuera de alcance: no encontrado, sin auditoría de revelación", async () => {
    for (const ctx of [contexto(otroId), contexto(tenantId, true)]) {
      expect(
        await mod.executeCapability(ctx, "core.estructuras.get", { id: estructuraId }),
      ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
      expect(
        await mod.executeCapability(ctx, "core.estructuras.list", {
          nivel: "persona",
          refId: personaId,
        }),
      ).toMatchObject({ ok: true, data: [] });
    }
  });

  it("no puede escribir ni elevar sus permisos", async () => {
    expect(
      await mod.executeCapability(contexto(), "core.estructuras.anular", {
        id: estructuraId,
        motivo: "Prueba negativa",
      }),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(
      await mod.executeCapability(contexto(), "core.roles.create", {
        nombre: "Escalada",
        permisos: ["core:estructuras.manage"],
      }),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

describe.skipIf(!urlPropietario)("core.cargos.list: montos sensibles (una sola consulta, ADR-045)", () => {
  let e: Entorno;
  let tenantId: string;
  const permisosRol = PLANTILLAS.find((p) => p.nombre === "Inspector DT")!.permisos;

  /** Cargo sensible nuevo con una estructura vigente, aislado por caso (sin eventos cruzados). */
  async function cargoSensibleConEstructura() {
    const cargoId = (
      await e.forTenant(tenantId).cargo.create({
        data: { tenantId, nombre: `Cargo sensible ${randomUUID()}`, sueldoSensible: true },
      })
    ).id;
    const estructuraId = (
      await e.forTenant(tenantId).estructuraSueldo.create({
        data: {
          tenantId,
          nivel: "cargo",
          cargoId,
          sueldoBase: 3_000_000,
          colacion: 0,
          movilizacion: 0,
          gratificacion: "legal_25",
          vigenteDesde: new Date("2026-01-01"),
        },
      })
    ).id;
    return { cargoId, estructuraId };
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    tenantId = (
      await e.admin.tenant.create({
        data: {
          slug: `inspector-cargos-${randomUUID()}`,
          nombre: "Inspector cargos test",
          vertical: "seguridad",
        },
      })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("sin read_sensible oculta los montos y no registra una revelación", async () => {
    const { cargoId, estructuraId } = await cargoSensibleConEstructura();
    const actorId = randomUUID();
    const ctx = mod.crearContexto({
      tenantId,
      rol: "viewer",
      actor: { tipo: "user", id: actorId },
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
    });
    const r = await mod.executeCapability(ctx, "core.cargos.list", {});
    expect(r).toMatchObject({
      ok: true,
      data: expect.arrayContaining([
        expect.objectContaining({
          id: cargoId,
          sueldoVigente: expect.objectContaining({ sueldoBase: null, sensible: true }),
        }),
      ]),
    });
    expect(
      await e.forTenant(tenantId).auditEvent.count({
        where: { capability: "core.estructuras.read_sensible", entityId: estructuraId },
      }),
    ).toBe(0);
  });

  it("Inspector DT ve los montos y queda un evento con actor vía (viaUserId)", async () => {
    const { cargoId, estructuraId } = await cargoSensibleConEstructura();
    const actorId = randomUUID();
    const viaUserId = randomUUID();
    const ctx = mod.crearContexto({
      tenantId,
      rol: "supervisor",
      permisosRol,
      actor: { tipo: "agent", id: actorId, viaUserId },
      medidor: { registrar: async () => undefined },
    });
    const r = await mod.executeCapability(ctx, "core.cargos.list", {});
    expect(r).toMatchObject({
      ok: true,
      data: expect.arrayContaining([
        expect.objectContaining({
          id: cargoId,
          sueldoVigente: expect.objectContaining({ sueldoBase: 3_000_000, sensible: false }),
        }),
      ]),
    });
    const eventos = await e.forTenant(tenantId).auditEvent.findMany({
      where: { capability: "core.estructuras.read_sensible", entityId: estructuraId },
    });
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.actorType).toBe("agent");
    expect(eventos[0]?.actorId).toBe(actorId);
    expect(eventos[0]?.viaUserId).toBe(viaUserId);
  });
});

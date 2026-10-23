// Aprobación humana y presupuesto de agentes contra Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("agentes en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let userId = "";
  let keyId = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const s = randomUUID().slice(0, 8);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `age-${s}`, nombre: "A", vertical: "seguridad" },
      })
    ).id;
    userId = (
      await e.admin.user.create({
        data: { name: "Ana", email: `ana-${s}@prueba.cl`, emailVerified: true },
      })
    ).id;
    await e.admin.membership.create({
      data: { tenantId, userId, rol: "owner", portales: ["erp"] },
    });
    keyId = (
      await e.admin.apiKey.create({
        data: {
          tenantId,
          userId,
          nombre: "Agente",
          prefijo: `opai_age_${s}`,
          hash: s,
          scopes: ["*"],
        },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const base = { tenantId, rol: "owner" as const, medidor: { registrar: async () => undefined } };
  const humano = () =>
    mod.crearContexto({
      ...base,
      tenantId,
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "Ana", email: "a@b.cl", platformRole: null },
    });
  const agente = () =>
    mod.crearContexto({
      ...base,
      tenantId,
      actor: { tipo: "agent", id: keyId, viaUserId: userId },
      scopes: ["*"],
      agente: { apiKeyId: keyId, nombre: "Agente", presupuestoMensualMicro: null, autonomia: {} },
    });

  it("lo irreversible del agente espera aprobación y se ejecuta al aprobar", async () => {
    const h = humano();
    const cargo = await mod.executeCapability(h, "core.cargos.create", { nombre: "Guardia" });
    const cargoId = cargo.ok ? (cargo.data as { id: string }).id : "";
    const p = await mod.executeCapability(h, "core.personas.create", {
      nombres: "Ana",
      apellidos: "Rojas",
      rut: "19.876.543-0",
      vinculo: { cargoId, tipo: "indefinido", inicio: "2025-01-02" },
    });
    const vinculoId = p.ok ? (p.data as { vinculoVigente: { id: string } }).vinculoVigente.id : "";
    const r = await mod.executeCapability(agente(), "core.vinculos.terminar", {
      id: vinculoId,
      termino: "2026-10-31",
      motivo: "Renuncia voluntaria",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
    const aprobacionId = r.ok ? "" : (r.error.aprobacionId ?? "");
    const a = await mod.executeCapability(humano(), "core.aprobaciones.aprobar", {
      id: aprobacionId,
    });
    expect(a).toMatchObject({ ok: true, data: { estado: "aprobada", resultado: { ok: true } } });
    expect(
      (await e.admin.vinculoLaboral.findUniqueOrThrow({ where: { id: vinculoId } })).estado,
    ).toBe("terminado");
    const audit = await e.admin.auditEvent.findMany({
      where: { tenantId, capability: "core.vinculos.terminar" },
    });
    expect(audit.map((x) => (x.payload as { aprobacionId?: string }).aprobacionId)).toContain(
      aprobacionId,
    );
  });
});

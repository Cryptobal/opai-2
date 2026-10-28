import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registrarObservadorConsultas } from "@opai/db";
import { type Entorno } from "../../db/test/entorno";
import { crearContexto, executeCapability } from "../src";
import { prepararVinculosJornada, comprobarIntegridadVinculo } from "./vinculos-jornada-fixture";
import { vinculoSchema } from "../src/core/maestros/vinculos-vista";
import { estructurasEfectiva } from "../src/core/maestros/estructuras-efectiva";
import { salidaPanel } from "../src/core/maestros/estructuras-panel-schema";

describe("07b PR 3: vínculo real, RLS y jornada", () => {
  let e: Entorno;
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  let tenantId: string,
    otro: string,
    personaId: string,
    cargoId: string,
    a: string,
    b: string,
    ajena: string,
    puestoId: string,
    id: string;
  const ctx = (
    rol: "owner" | "gerente" | "supervisor" = "owner",
    alcance: string[] | null = null,
    tenant = tenantId,
  ) =>
    crearContexto({
      tenantId: tenant,
      rol,
      actor: { tipo: "system" },
      ...(alcance ? { alcance: { instalaciones: alcance } } : {}),
    });
  const entrada = () => ({
    personaId,
    cargoId,
    instalacionId: a,
    horasSemanales: 40,
    distribucion: "Lunes a viernes",
    tipo: "indefinido",
    inicio: "2026-01-01",
  });
  beforeAll(async () => {
    f = await prepararVinculosJornada();
    ({ e, tenantId, otro, personaId, cargoId, a, b, ajena, puestoId } = f);
  });
  afterAll(async () => {
    registrarObservadorConsultas(null);
    await e?.cerrar();
  });
  it("valida jornada e instalación, y la vista previa no escribe", async () => {
    expect(
      await executeCapability(ctx(), "core.vinculos.create", { ...entrada(), horasSemanales: 0 }),
    ).toMatchObject({ ok: false });
    expect(
      await executeCapability(ctx(), "core.vinculos.create", {
        ...entrada(),
        instalacionId: ajena,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(
      await executeCapability(ctx(), "core.vinculos.create", entrada(), { dryRun: true }),
    ).toMatchObject({ ok: true });
    expect(await e.forTenant(tenantId).vinculoLaboral.count({})).toBe(0);
  });
  it("crea uno vigente, reintenta con idempotencia y resuelve desde el vínculo", async () => {
    const opciones = { idempotencyKey: randomUUID() };
    const r = await executeCapability(ctx(), "core.vinculos.create", entrada(), opciones);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.error.message);
    id = vinculoSchema.parse(r.data).id;
    expect(
      await executeCapability(ctx(), "core.vinculos.create", entrada(), opciones),
    ).toMatchObject({ ok: true, repetida: true });
    expect(await executeCapability(ctx(), "core.vinculos.create", entrada())).toMatchObject({
      ok: false,
    });
    const ef = await executeCapability(ctx(), "core.estructuras.efectiva", { personaId });
    expect(ef.ok && estructurasEfectiva.output.parse(ef.data).capa).toBe("instalacion");
    let consultas = 0;
    registrarObservadorConsultas(() => consultas++);
    const panel = await executeCapability(ctx(), "core.estructuras.panel", {
      tipo: "persona",
      id: personaId,
    });
    registrarObservadorConsultas(null);
    expect(panel.ok && salidaPanel.parse(panel.data).efectiva?.capa).toBe("instalacion");
    expect(consultas).toBeLessThanOrEqual(8);
  });
  it("aplica permisos y alcance real; no permite autoampliarlo moviendo el vínculo", async () => {
    expect(
      await executeCapability(ctx("gerente"), "core.vinculos.update", { id, distribucion: "4×4" }),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(
      await executeCapability(ctx("supervisor", [a]), "core.personas.get", { id: personaId }),
    ).toMatchObject({ ok: true });
    expect(
      await executeCapability(ctx("supervisor", [b]), "core.personas.get", { id: personaId }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(
      await executeCapability(ctx("owner", [b]), "core.vinculos.update", { id, instalacionId: b }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(
      await executeCapability(ctx("owner", null, otro), "core.vinculos.update", { id }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
  it("compara instalación y puesto y registra el evento atómico para PR 4", async () => {
    const r = await executeCapability(ctx(), "core.vinculos.previsualizar", {
      personaId,
      instalacionId: b,
      puestoId,
    });
    expect(r).toMatchObject({
      ok: true,
      data: { antes: { capa: "instalacion" }, despues: { capa: "puesto" } },
    });
    expect(
      await executeCapability(ctx(), "core.vinculos.update", { id, instalacionId: b, puestoId }),
    ).toMatchObject({ ok: true });
    expect(
      await e
        .forTenant(tenantId)
        .evento.count({ where: { tipo: "core.vinculo.actualizado", entidadId: id } }),
    ).toBe(1);
    expect(
      await executeCapability(ctx(), "core.vinculos.previsualizar", {
        personaId,
        instalacionId: b,
        puestoId: null,
      }),
    ).toMatchObject({ ok: true, data: { antes: { capa: "puesto" }, despues: { capa: null } } });
    expect(
      await executeCapability(ctx("supervisor", [a]), "core.personas.get", { id: personaId }),
    ).toMatchObject({ ok: false });
  });
  it("la base preserva RLS, mismo tenant, coherencia y único vigente, incluso sin capacidades", async () => {
    await comprobarIntegridadVinculo(f, id);
  });
});

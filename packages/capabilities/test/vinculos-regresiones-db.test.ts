import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearContexto, executeCapability } from "../src";
import { vinculoSchema } from "../src/core/maestros/vinculos-vista";
import { prepararVinculosJornada } from "./vinculos-jornada-fixture";

describe("07b: regresiones de autorrevisión", () => {
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  let id: string;
  const ctx = () =>
    crearContexto({ tenantId: f.tenantId, rol: "owner", actor: { tipo: "system" } });
  beforeAll(async () => {
    f = await prepararVinculosJornada();
    const r = await executeCapability(ctx(), "core.vinculos.create", {
      personaId: f.personaId,
      cargoId: f.cargoId,
      instalacionId: f.a,
      horasSemanales: 40,
      distribucion: "Lunes a viernes",
      tipo: "plazo_fijo",
      inicio: "2026-01-01",
      termino: "2026-12-31",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.error.message);
    id = vinculoSchema.parse(r.data).id;
  });
  afterAll(async () => {
    await f?.e.cerrar();
  });
  it("preview respeta permiso de estructuras y oculta montos sin permiso sensible", async () => {
    const entrada = { personaId: f.personaId, instalacionId: f.b, puestoId: f.puestoId };
    const denegado = crearContexto({
      tenantId: f.tenantId,
      rol: "owner",
      actor: { tipo: "system" },
      excepciones: [{ permiso: "core:estructuras.read", conceder: false }],
    });
    expect(await executeCapability(denegado, "core.vinculos.previsualizar", entrada)).toMatchObject(
      { ok: false, error: { code: "FORBIDDEN" } },
    );
    const viewer = crearContexto({
      tenantId: f.tenantId,
      rol: "viewer",
      actor: { tipo: "system" },
    });
    expect(await executeCapability(viewer, "core.vinculos.previsualizar", entrada)).toMatchObject({
      ok: true,
      data: { despues: { capa: "puesto", estructura: { sueldoBase: null, sensible: true } } },
    });
  });
  it("comprueba ambas fechas y rechaza la versión obsoleta tras una carrera", async () => {
    expect(
      await executeCapability(ctx(), "core.vinculos.update", { id, inicio: "2027-01-01" }),
    ).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const actual = await f.e
      .forTenant(f.tenantId)
      .vinculoLaboral.findUniqueOrThrow({ where: { id } });
    const resultados = await Promise.all(
      [41, 42].map((horasSemanales) =>
        executeCapability(ctx(), "core.vinculos.update", {
          id,
          horasSemanales,
          versionEsperada: actual.updatedAt.toISOString(),
        }),
      ),
    );
    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    expect(resultados.filter((r) => !r.ok)).toMatchObject([{ error: { code: "CONFLICT" } }]);
  });
  it("CHECK rechaza cada jornada parcial incluso con acceso directo", async () => {
    const db = f.e.forTenant(f.tenantId);
    await expect(
      db.vinculoLaboral.update({
        where: { id },
        data: { horasSemanales: null, distribucion: "4×4" },
      }),
    ).rejects.toThrow();
    await expect(
      db.vinculoLaboral.update({ where: { id }, data: { horasSemanales: 40, distribucion: null } }),
    ).rejects.toThrow();
  });
  it("el vínculo terminado deja de dar alcance a personas", async () => {
    const supervisor = () =>
      crearContexto({
        tenantId: f.tenantId,
        rol: "supervisor",
        actor: { tipo: "system" },
        alcance: { instalaciones: [f.a] },
      });
    expect(
      await executeCapability(supervisor(), "core.personas.get", { id: f.personaId }),
    ).toMatchObject({ ok: true });
    expect(
      await executeCapability(ctx(), "core.vinculos.terminar", {
        id,
        termino: "2026-10-27",
        motivo: "Fin del contrato de prueba",
      }),
    ).toMatchObject({ ok: true });
    expect(
      await executeCapability(supervisor(), "core.personas.get", { id: f.personaId }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

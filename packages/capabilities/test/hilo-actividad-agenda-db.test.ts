import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";

/**
 * Hilo H3 (CAR-331): Actividad y Agenda del hilo con RLS real y dos empresas. La misma capacidad
 * sirve a la pantalla, a `/api/v1` y al MCP, así que basta probarla con `executeCapability`.
 */
describe.skipIf(!urlPropietario)("hilo: actividad y agenda con alcance y dos empresas", () => {
  let e: Entorno;
  let tenantId = "";
  let otroTenant = "";
  let instA = "";
  let instB = "";
  const ownerId = randomUUID();
  const viewerId = randomUUID();
  const supId = randomUUID();
  const medidor = { registrar: async () => undefined };

  type Params = Parameters<typeof mod.crearContexto>[0];
  const ctx = (
    rol: NonNullable<Params["rol"]>,
    actorId: string,
    extra: Pick<Params, "alcance"> = {},
    tenant = tenantId,
  ) =>
    mod.crearContexto({
      tenantId: tenant,
      actor: { tipo: "user", id: actorId },
      usuario: {
        id: actorId,
        email: `${actorId}@prueba.test`,
        nombre: "Prueba",
        platformRole: null,
      },
      rol,
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor,
      ...extra,
    });

  async function ok<T>(c: ReturnType<typeof ctx>, id: string, input: unknown): Promise<T> {
    const r = await mod.executeCapability(c, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    for (const n of [0, 1]) {
      const t = await e.admin.tenant.create({
        data: { slug: `hilo-h3-${randomUUID()}`, nombre: `Hilo ${n}`, vertical: "seguridad" },
      });
      if (n === 0) tenantId = t.id;
      else otroTenant = t.id;
    }
    const owner = ctx("owner", ownerId);
    const cuenta = await ok<{ id: string }>(owner, "core.cuentas.create", { nombre: "Andina" });
    instA = (
      await ok<{ id: string }>(owner, "core.instalaciones.create", {
        cuentaId: cuenta.id,
        nombre: "Norte",
      })
    ).id;
    instB = (
      await ok<{ id: string }>(owner, "core.instalaciones.create", {
        cuentaId: cuenta.id,
        nombre: "Sur",
      })
    ).id;
    // Algo hecho por quien no tiene auditoría (viewer): solo eso debe ver de la empresa.
    const otroOwner = ctx("owner", randomUUID(), {}, otroTenant);
    await ok(otroOwner, "core.cuentas.create", { nombre: "Ajena" });
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  type Act = {
    alcance: string;
    items: { entidad: { tipo: string; id: string } | null; actor: { nombre: string } }[];
  };

  it("quien tiene auditoría ve la actividad de toda su empresa y nada de otra", async () => {
    const r = await ok<Act>(ctx("owner", ownerId), "core.hilo.actividad", { limite: 20 });
    expect(r.alcance).toBe("empresa");
    const ids = r.items.map((i) => i.entidad?.id);
    expect(ids).toContain(instA);
    expect(ids).toContain(instB);
    const ajena = await ok<Act>(
      ctx("owner", randomUUID(), {}, otroTenant),
      "core.hilo.actividad",
      {},
    );
    expect(ajena.items.map((i) => i.entidad?.id)).not.toContain(instA);
  });

  it("un supervisor acotado ve solo lo de sus instalaciones", async () => {
    const sup = ctx("supervisor", supId, { alcance: { instalaciones: [instA] } });
    const r = await ok<Act>(sup, "core.hilo.actividad", { limite: 20 });
    expect(r.alcance).toBe("instalaciones");
    const ids = r.items.map((i) => i.entidad?.id);
    expect(ids).toContain(instA);
    expect(ids).not.toContain(instB);
    const sinNada = await ok<Act>(
      ctx("supervisor", supId, { alcance: { instalaciones: [] } }),
      "core.hilo.actividad",
      {},
    );
    expect(sinNada.items).toEqual([]);
  });

  it("quien no tiene auditoría ve solo lo propio", async () => {
    const r = await ok<Act>(ctx("viewer", viewerId), "core.hilo.actividad", {});
    expect(r.alcance).toBe("propia");
    expect(r.items).toEqual([]);
  });

  it("la agenda junta las fuentes que el actor puede ver y respeta el alcance", async () => {
    type Ag = { fuentes: string[]; items: { origen: string; ficha: { id: string } | null }[] };
    const r = await ok<Ag>(ctx("owner", ownerId), "core.hilo.agenda", { dias: 30 });
    expect(r.fuentes).toEqual(expect.arrayContaining(["tareas", "documentos"]));
    const sup = await ok<Ag>(
      ctx("supervisor", supId, { alcance: { instalaciones: [instA] } }),
      "core.hilo.agenda",
      {},
    );
    expect(sup.items.every((i) => !i.ficha || i.ficha.id !== instB)).toBe(true);
  });
});

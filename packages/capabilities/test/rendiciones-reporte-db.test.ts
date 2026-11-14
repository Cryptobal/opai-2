// Rendiciones · reporte (CAR-179) con Postgres real. Solo datos ficticios (empresas qa-rep*, montos inventados).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/rendiciones/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Rol = "owner" | "gerente" | "viewer";
type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string } };

describe.skipIf(omitirSuiteDb())("Rendiciones · reporte (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { a: "", b: "" };
  const u = { ana: randomUUID(), beto: randomUUID(), viewer: randomUUID(), duenoB: randomUUID() };
  let inst = "";

  const como = (uid: string, rol: Rol, tid: string) => async (id: string, input: Record<string, unknown>) =>
    (await mod.executeCapability(
      mod.crearContexto({
        tenantId: tid, actor: { tipo: "user", id: uid },
        usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@rep.test`, platformRole: null },
        portal: "erp", portalesMembresia: ["erp"], rol, modulosActivos: ["rendiciones"], medidor: { registrar: async () => undefined },
      }),
      id, input,
    )) as R;
  const periodo = { desde: "2026-10-01", hasta: "2026-10-31" };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const mk = (s: string) => e.admin.tenant.create({ data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" } });
    t.a = (await mk("qa-repa")).id;
    t.b = (await mk("qa-repb")).id;
    for (const [id, nombre, rol, tid] of [[u.ana, "Ana Ficticia", "gerente", t.a], [u.beto, "Beto Ficticio", "gerente", t.a], [u.viewer, "Vera Lectora", "viewer", t.a], [u.duenoB, "Dueño Beta", "owner", t.b]] as const) {
      await e.admin.user.create({ data: { id, name: nombre, email: `${id.slice(0, 8)}@rep.test` } });
      await e.admin.membership.create({ data: { tenantId: tid, userId: id, rol, portales: ["erp"] } });
    }
    const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: t.a, nombre: "Cliente ficticio" } })).id;
    inst = (await e.admin.instalacion.create({ data: { tenantId: t.a, cuentaId, nombre: "Portería ficticia" } })).id;
    const filas: [string, string, string, string, string | null, number, string, number][] = [
      // [tenant, solicitante, tipo, estado, instalacion, monto, aprobada (UTC), código]
      [t.a, u.ana, "compra", "aprobada", null, 10_000, "2026-10-05T15:00:00Z", 1],
      [t.a, u.ana, "kilometraje", "pagada", inst, 4_000, "2026-10-20T15:00:00Z", 2],
      [t.a, u.beto, "compra", "pagada", inst, 25_000, "2026-10-31T23:30:00Z", 3], // 20:30 del 31 en Chile: entra
      [t.a, u.beto, "compra", "enviada", null, 99_000, "2026-10-10T15:00:00Z", 4], // enviada: no es gasto
      [t.a, u.beto, "compra", "aprobada", null, 77_000, "2026-11-01T04:00:00Z", 5], // 1 de noviembre en Chile: fuera
      [t.b, u.duenoB, "compra", "aprobada", null, 55_000, "2026-10-05T15:00:00Z", 1],
    ];
    for (const [tenantId, solicitanteId, tipo, estado, instalacionId, montoTotal, en, codigo] of filas)
      await e.admin.rendicion.create({ data: { tenantId, codigo, tipo, estado, solicitanteId, centroCosto: instalacionId ? "instalacion" : "administracion", instalacionId, descripcion: "Gasto ficticio", montoTotal, decididaEn: new Date(en) } });
  });
  afterAll(async () => { await e?.cerrar(); });

  it("suma aprobadas y pagadas del período por persona, con nombres y sin otra empresa", async () => {
    const r = await como(u.ana, "gerente", t.a)("rendiciones.reporte.get", { periodo });
    expect(r.ok).toBe(true);
    expect(r.data).toMatchObject({ cantidad: 3, totalClp: 39_000, aprobadoClp: 10_000, pagadoClp: 29_000 });
    expect(r.data?.["grupos"]).toEqual([
      { clave: u.beto, etiqueta: "Beto Ficticio", cantidad: 1, totalClp: 25_000, aprobadoClp: 0, pagadoClp: 25_000 },
      { clave: u.ana, etiqueta: "Ana Ficticia", cantidad: 2, totalClp: 14_000, aprobadoClp: 10_000, pagadoClp: 4_000 },
    ]);
  });

  it("agrupa por centro de costo y por categoría", async () => {
    const centro = await como(u.ana, "gerente", t.a)("rendiciones.reporte.get", { periodo, agrupar: "centro" });
    expect((centro.data?.["grupos"] as { etiqueta: string; totalClp: number }[]).map((g) => [g.etiqueta, g.totalClp])).toEqual([["Portería ficticia", 29_000], ["Administración / Oficina central", 10_000]]);
    const cat = await como(u.ana, "gerente", t.a)("rendiciones.reporte.get", { periodo, agrupar: "categoria" });
    expect((cat.data?.["grupos"] as { etiqueta: string }[]).map((g) => g.etiqueta)).toEqual(["Compra", "Kilometraje"]);
  });

  it("exige ver todas, valida el período y aísla la otra empresa", async () => {
    expect(await como(u.viewer, "viewer", t.a)("rendiciones.reporte.get", { periodo })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await como(u.ana, "gerente", t.a)("rendiciones.reporte.get", { periodo: { desde: "2026-10-31", hasta: "2026-10-01" } })).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(await como(u.ana, "gerente", t.a)("rendiciones.reporte.get", { periodo: { desde: "2025-01-01", hasta: "2026-10-31" } })).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(await como(u.ana, "gerente", t.a)("rendiciones.reporte.get", { periodo: { desde: "2026-02-01", hasta: "2026-02-31" } })).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(await como(u.duenoB, "owner", t.b)("rendiciones.reporte.get", { periodo })).toMatchObject({ ok: true, data: { cantidad: 1, totalClp: 55_000 } });
  });

  it("el Excel trae una fila por rendición del período", async () => {
    const r = await como(u.ana, "gerente", t.a)("rendiciones.reporte.excel", { periodo });
    expect(r.ok).toBe(true);
    expect(r.data).toMatchObject({ filas: 3, nombre: "rendiciones-2026-10-01-a-2026-10-31.xlsx" });
    // Un .xlsx es un zip: la fila a fila del archivo la cubre la prueba del módulo con datos sin base.
    expect(String(r.data?.["base64"]).startsWith("UEsDB")).toBe(true);
    expect((r.data?.["ids"] as string[]).length).toBe(3);
  });
});

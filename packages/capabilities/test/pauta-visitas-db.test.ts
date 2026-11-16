// CAR-83 (Brief 12, PR 1): visitas de supervisión. Hora del servidor, GPS que nunca bloquea, una en curso por persona,
// solo quien la inició la cierra, cerrada no se edita, alcance del supervisor y sin cruzar empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest as manifestPauta } from "../../../modules/pauta/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as Mod from "../src";

type Rol = "owner" | "supervisor";

describe.skipIf(omitirSuiteDb())("pauta.visitas (CAR-83)", () => {
  let e: Entorno, mod: typeof Mod;
  const t = { a: "", b: "" };
  const u = { sup: randomUUID(), sup2: randomUUID(), due: randomUUID() };
  const inst: Record<string, string> = {};
  const ctx = (uid: string, rol: Rol, tid: string, instalaciones?: string[]) =>
    mod.crearContexto({
      ...(instalaciones ? { alcance: { instalaciones } } : {}),
      tenantId: tid, actor: { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@vis.test`, platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol, modulosActivos: ["pauta"], medidor: { registrar: async () => undefined },
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, dryRun = false) => mod.executeCapability(c, id, input, { dryRun });
  const data = async <T,>(p: ReturnType<typeof run>) => {
    const r = await p;
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as T;
  };
  type V = { id: string; estado: string; geocerca: string; distanciaM: number | null; checklist: unknown[]; supervisor: string | null };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifestPauta]);
    const mk = (s: string) => e.admin.tenant.create({ data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" } });
    t.a = (await mk("qa-visa")).id;
    t.b = (await mk("qa-visb")).id;
    for (const [id, tid, rol] of [[u.sup, t.a, "supervisor"], [u.sup2, t.a, "supervisor"], [u.due, t.b, "owner"]] as const) {
      await e.admin.user.create({ data: { id, name: `Sup ${id.slice(0, 4)}`, email: `${id.slice(0, 8)}@vis.test` } });
      await e.admin.membership.create({ data: { tenantId: tid, userId: id, rol, portales: ["erp"] } });
    }
    const mkInst = async (k: string, tenantId: string, ubic: boolean) => {
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: `Cliente ${k}` } })).id;
      inst[k] = (await e.admin.instalacion.create({
        data: { tenantId, cuentaId, nombre: `Bodega ${k}`, geocercaM: 300, ...(ubic ? { lat: -33.4, lng: -70.6 } : {}) },
      })).id;
    };
    await mkInst("norte", t.a, true);
    await mkInst("sur", t.a, false);
    await mkInst("beta", t.b, true);
  });
  afterAll(async () => { await e?.cerrar(); });

  it("la vista previa clasifica la llegada y trae la lista base, sin guardar", async () => {
    const r = await data<{ visita: null; geocerca: string; distanciaM: number; lista: string[] }>(
      run(ctx(u.sup, "supervisor", t.a, [inst["norte"]!]), "pauta.visitas.iniciar", { instalacionId: inst["norte"], ubicacion: { lat: -33.4009, lng: -70.6, precisionM: 12 } }, true),
    );
    expect(r).toMatchObject({ visita: null, geocerca: "dentro", distanciaM: 100 });
    expect(r.lista.length).toBeGreaterThan(0);
    expect(await e.admin.visitaSupervision.count({ where: { tenantId: t.a } })).toBe(0);
  });

  it("inicia, no deja abrir otra en curso, la cierra solo quien la inició y cerrada no se edita", async () => {
    const c = ctx(u.sup, "supervisor", t.a, [inst["norte"]!, inst["sur"]!]);
    const { visita } = await data<{ visita: V }>(run(c, "pauta.visitas.iniciar", { instalacionId: inst["sur"] }));
    expect(visita).toMatchObject({ estado: "en_curso", geocerca: "sin_gps", distanciaM: null, supervisor: `Sup ${u.sup.slice(0, 4)}` });
    const otra = await run(c, "pauta.visitas.iniciar", { instalacionId: inst["norte"] });
    expect(otra.ok ? null : otra.error.code).toBe("CONFLICT");
    const ajena = await run(ctx(u.sup2, "supervisor", t.a, [inst["sur"]!]), "pauta.visitas.cerrar", { visitaId: visita.id, checklist: [] });
    expect(ajena.ok ? null : ajena.error.code).toBe("FORBIDDEN");
    const checklist = [{ texto: "Extintores", resultado: "no_cumple", nota: "Vencido" }, { texto: "Luces", resultado: "cumple" }];
    const { visita: cerrada } = await data<{ visita: V }>(run(c, "pauta.visitas.cerrar", { visitaId: visita.id, checklist, observaciones: "Sin novedades" }));
    expect(cerrada.estado).toBe("cerrada");
    expect(cerrada.checklist).toEqual([{ texto: "Extintores", resultado: "no_cumple", nota: "Vencido" }, { texto: "Luces", resultado: "cumple", nota: null }]);
    const otraVez = await run(c, "pauta.visitas.cerrar", { visitaId: visita.id, checklist: [] });
    expect(otraVez.ok ? null : otraVez.error.code).toBe("CONFLICT");
    expect(await e.admin.evento.count({ where: { tenantId: t.a, tipo: "pauta.visita.cerrada", entidadId: visita.id } })).toBe(1);
  });

  it("el supervisor no inicia ni ve visitas fuera de sus instalaciones", async () => {
    const fuera = await run(ctx(u.sup2, "supervisor", t.a, [inst["sur"]!]), "pauta.visitas.iniciar", { instalacionId: inst["norte"] });
    expect(fuera.ok ? null : fuera.error.code).toBe("NOT_FOUND");
    const { items } = await data<{ items: V[] }>(run(ctx(u.sup2, "supervisor", t.a, [inst["norte"]!]), "pauta.visitas.listar", {}));
    expect(items).toEqual([]);
    const { items: todas } = await data<{ items: V[] }>(run(ctx(u.sup2, "supervisor", t.a, [inst["sur"]!]), "pauta.visitas.listar", {}));
    expect(todas).toHaveLength(1);
    const ver = await data<V>(run(ctx(u.sup2, "supervisor", t.a, [inst["sur"]!]), "pauta.visitas.obtener", { visitaId: todas[0]!.id }));
    expect(ver.id).toBe(todas[0]!.id);
  });

  it("dos «iniciar» a la vez: uno entra y el otro es CONFLICT; quien perdió la instalación igual cierra la suya", async () => {
    const c = ctx(u.sup2, "supervisor", t.a, [inst["sur"]!]);
    const rs = await Promise.all([1, 2].map(() => run(c, "pauta.visitas.iniciar", { instalacionId: inst["sur"] })));
    expect(rs.map((r) => (r.ok ? "ok" : r.error.code)).sort()).toEqual(["CONFLICT", "ok"]);
    const ok = rs.find((r) => r.ok);
    const id = ok && ok.ok ? (ok.data as { visita: V }).visita.id : "";
    const sinAlcance = ctx(u.sup2, "supervisor", t.a, []);
    const { visita } = await data<{ visita: V }>(run(sinAlcance, "pauta.visitas.cerrar", { visitaId: id, checklist: [] }));
    expect(visita.estado).toBe("cerrada");
    const mal = await run(c, "pauta.visitas.listar", { cursor: "no-es-uuid" });
    expect(mal.ok ? null : mal.error.code).toBe("UNPROCESSABLE");
  });

  it("otra empresa no ve ni cierra las visitas de esta", async () => {
    const [v] = await e.admin.visitaSupervision.findMany({ where: { tenantId: t.a } });
    const dueB = ctx(u.due, "owner", t.b);
    const { items } = await data<{ items: V[] }>(run(dueB, "pauta.visitas.listar", {}));
    expect(items).toEqual([]);
    const ver = await run(dueB, "pauta.visitas.obtener", { visitaId: v!.id });
    expect(ver.ok ? null : ver.error.code).toBe("NOT_FOUND");
    const cruzada = await run(dueB, "pauta.visitas.iniciar", { instalacionId: inst["norte"] });
    expect(cruzada.ok ? null : cruzada.error.code).toBe("NOT_FOUND");
  });
});

// CAR-403: la búsqueda global encuentra rendiciones por número, descripción o persona, con el alcance de quien busca
// y sin cruzar empresas. Solo datos ficticios (empresas qa-busr*).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/rendiciones/manifest";
import { codigoDeBusqueda } from "../../../modules/rendiciones/buscador";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as Mod from "../src";

type Rol = "owner" | "gerente" | "viewer";
type Grupo = { grupo: string; items: { id: string; titulo: string; detalle: string | null; href: string }[] };

describe("codigoDeBusqueda", () => {
  it("reconoce REN-12, ren 12 y 12; lo demás no es número", () => {
    expect(codigoDeBusqueda("REN-12")).toBe(12);
    expect(codigoDeBusqueda("ren 12")).toBe(12);
    expect(codigoDeBusqueda(" 12 ")).toBe(12);
    expect(codigoDeBusqueda("peaje 12")).toBeNull();
  });
});

describe.skipIf(omitirSuiteDb())("core.buscar · aporte de Rendiciones (CAR-403)", () => {
  let e: Entorno, mod: typeof Mod;
  const t = { a: "", b: "" };
  const u = { rita: randomUUID(), raul: randomUUID(), ana: randomUUID(), ger: randomUUID(), lector: randomUUID(), dueB: randomUUID() };
  const r: Record<string, string> = {};
  const ctx = (uid: string, rol: Rol, tid: string, permisosRol?: string[]) =>
    mod.crearContexto({
      ...(permisosRol ? { permisosRol } : {}),
      tenantId: tid, actor: { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@busr.test`, platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol, modulosActivos: ["rendiciones"], medidor: { registrar: async () => undefined },
    });
  const buscar = async (c: ReturnType<typeof ctx>, q: string) => {
    const res = await mod.executeCapability(c, "core.buscar", { q }, {});
    if (!res.ok) throw new Error(JSON.stringify(res.error));
    return (res.data as { otros: Grupo[] }).otros.find((g) => g.grupo === "rendiciones")?.items ?? [];
  };
  const SOLO_RENDIR = ["rendiciones:rendir", "rendiciones:aprobar"];

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const mk = (s: string) => e.admin.tenant.create({ data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" } });
    t.a = (await mk("qa-busra")).id;
    t.b = (await mk("qa-busrb")).id;
    const gente: [string, string, Rol, string][] = [
      [u.rita, "Rita Zafiro", "gerente", t.a], [u.raul, "Raúl Ficticio", "gerente", t.a], [u.ana, "Ana Aprueba", "gerente", t.a],
      [u.ger, "Gerardo Todo", "gerente", t.a], [u.lector, "Lea Lectora", "viewer", t.a], [u.dueB, "Zafiro Beta", "owner", t.b],
    ];
    for (const [id, name, rol, tid] of gente) {
      await e.admin.user.create({ data: { id, name, email: `${id.slice(0, 8)}@busr.test` } });
      await e.admin.membership.create({ data: { tenantId: tid, userId: id, rol, portales: ["erp"] } });
    }
    const crear = async (k: string, tenantId: string, codigo: number, solicitanteId: string, aprobadorId: string | null, descripcion: string) => {
      r[k] = (await e.admin.rendicion.create({ data: { tenantId, codigo, tipo: "compra", estado: "enviada", solicitanteId, aprobadorId, centroCosto: "administracion", descripcion, montoTotal: 1000 } })).id;
    };
    await crear("ritaPeaje", t.a, 7, u.rita, u.ana, "Peaje autopista ficticia");
    await crear("raulPeaje", t.a, 8, u.raul, null, "Peaje de vuelta");
    await crear("beta", t.b, 7, u.dueB, null, "Peaje autopista ficticia");
  });
  afterAll(async () => { await e?.cerrar(); });

  it("quien tiene «ver todas» encuentra toda la empresa por descripción, número o persona, y nada de otra", async () => {
    const ger = ctx(u.ger, "gerente", t.a);
    expect((await buscar(ger, "peaje")).map((x) => x.id).sort()).toEqual([r["ritaPeaje"], r["raulPeaje"]].sort());
    expect(await buscar(ger, "REN-7")).toEqual([{ id: r["ritaPeaje"], titulo: "REN-7 · Peaje autopista ficticia", detalle: "Rita Zafiro · Enviada", href: `/rendiciones/${r["ritaPeaje"]}` }]);
    expect((await buscar(ger, "zafiro")).map((x) => x.id)).toEqual([r["ritaPeaje"]]);
    expect(JSON.stringify(await buscar(ger, "peaje"))).not.toContain(r["beta"]!);
  });

  it("sin «ver todas», solo lo propio y lo que le toca aprobar", async () => {
    expect((await buscar(ctx(u.raul, "gerente", t.a, SOLO_RENDIR), "peaje")).map((x) => x.id)).toEqual([r["raulPeaje"]]);
    expect((await buscar(ctx(u.ana, "gerente", t.a, SOLO_RENDIR), "peaje")).map((x) => x.id)).toEqual([r["ritaPeaje"]]);
  });

  it("sin el permiso de rendir no aparece el grupo", async () => {
    const res = await mod.executeCapability(ctx(u.lector, "viewer", t.a), "core.buscar", { q: "peaje" }, {});
    expect(res.ok).toBe(true);
    if (res.ok) expect((res.data as { otros: Grupo[] }).otros.map((g) => g.grupo)).not.toContain("rendiciones");
  });
});

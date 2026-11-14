// CAR-405: la búsqueda global encuentra rondas por su nombre o por el de su instalación, con el alcance del
// supervisor en la consulta y sin cruzar empresas. Solo datos ficticios (empresas qa-busro*).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/rondas/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as Mod from "../src";

type Grupo = {
  grupo: string;
  items: { id: string; titulo: string; detalle: string | null; href: string }[];
};

describe.skipIf(omitirSuiteDb())("core.buscar · aporte de Rondas (CAR-405)", () => {
  let e: Entorno, mod: typeof Mod;
  const t = { a: "", b: "" };
  const inst = { norte: "", sur: "", beta: "" };
  const r: Record<string, string> = {};
  const ctx = (
    tid: string,
    rol: "owner" | "supervisor" | "viewer",
    alcance: string[] | null = null,
    permisosRol?: string[],
  ) =>
    mod.crearContexto({
      ...(permisosRol ? { permisosRol } : {}),
      tenantId: tid,
      actor: { tipo: "system" },
      rol,
      alcance: alcance ? { instalaciones: alcance } : null,
      modulosActivos: ["rondas"],
      medidor: { registrar: async () => undefined },
    });
  const buscar = async (c: ReturnType<typeof ctx>, q: string) => {
    const res = await mod.executeCapability(c, "core.buscar", { q }, {});
    if (!res.ok) throw new Error(JSON.stringify(res.error));
    return res.data as { otros: Grupo[] };
  };
  const rondas = async (c: ReturnType<typeof ctx>, q: string) =>
    (await buscar(c, q)).otros.find((g) => g.grupo === "rondas")?.items ?? [];

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const mk = (s: string) =>
      e.admin.tenant.create({
        data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" },
      });
    t.a = (await mk("qa-busroa")).id;
    t.b = (await mk("qa-busrob")).id;
    const instalacion = async (tenantId: string, nombre: string) => {
      const cuentaId = (
        await e.admin.cuenta.create({ data: { tenantId, nombre: `Cliente ${nombre}` } })
      ).id;
      return (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre } })).id;
    };
    inst.norte = await instalacion(t.a, "Bodega Norte");
    inst.sur = await instalacion(t.a, "Planta Sur");
    inst.beta = await instalacion(t.b, "Bodega Norte");
    const plantilla = async (
      k: string,
      tenantId: string,
      instalacionId: string,
      nombre: string,
      estado = "activo",
    ) => {
      r[k] = (
        await e.admin.plantillaRonda.create({
          data: { tenantId, instalacionId, nombre, tiempoMaxMin: 60, estado },
        })
      ).id;
    };
    await plantilla("perimetro", t.a, inst.norte, "Ronda perímetro");
    await plantilla("nocturna", t.a, inst.sur, "Ronda nocturna");
    await plantilla("archivada", t.a, inst.sur, "Ronda perímetro antigua", "archivado");
    await plantilla("beta", t.b, inst.beta, "Ronda perímetro");
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar();
  });

  it("encuentra por nombre de la ronda o de la instalación, solo activas y sin otra empresa", async () => {
    const owner = ctx(t.a, "owner");
    expect(await rondas(owner, "perímetro")).toEqual([
      {
        id: r["perimetro"],
        titulo: "Ronda perímetro",
        detalle: "Bodega Norte",
        href: `/instalaciones/${inst.norte}/rondas`,
      },
    ]);
    expect((await rondas(owner, "planta sur")).map((x) => x.id)).toEqual([r["nocturna"]]);
    expect(JSON.stringify(await rondas(owner, "bodega"))).not.toContain(r["beta"]!);
  });

  it("el supervisor solo ve las rondas de sus instalaciones", async () => {
    const sup = ctx(t.a, "supervisor", [inst.sur]);
    expect(await rondas(sup, "perímetro")).toEqual([]);
    expect(await rondas(sup, "bodega")).toEqual([]);
    expect((await rondas(sup, "ronda")).map((x) => x.id)).toEqual([r["nocturna"]]);
  });

  it("sin el permiso de ver rondas no aparece el grupo", async () => {
    const sinPermiso = ctx(t.a, "viewer", null, ["core:instalaciones.read"]);
    expect((await buscar(sinPermiso, "ronda")).otros.map((g) => g.grupo)).not.toContain("rondas");
  });
});

// CAR-77: lectura del libro de novedades del núcleo contra Postgres real con dos empresas: código NOV, paginación,
// alcance del supervisor en la consulta (ve una instalación y no la otra de la misma empresa), sin enumeración entre
// empresas y lectura auditada con los IDs de la página. Solo datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Pagina = {
  items: { id: string; codigo: string; instalacionId: string }[];
  siguiente: string | null;
};

describe.skipIf(!urlPropietario)("libro de novedades del núcleo (CAR-77)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A1: "", A2: "", B: "" };

  const listar = async (k: "A" | "B", input: object, alcance: string[] | null = null) => {
    const ctx = mod.crearContexto({
      tenantId: t[k],
      actor: { tipo: "system" },
      rol: alcance ? "supervisor" : "owner",
      alcance: alcance ? { instalaciones: alcance } : null,
      medidor: { registrar: async () => undefined },
      modulosActivos: ["rondas"],
    });
    return mod.executeCapability(ctx, "core.libro_novedades.listar", input);
  };
  const datos = (r: Awaited<ReturnType<typeof listar>>) => {
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as Pagina;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const s = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `qa-ln-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
    }
    const instalacion = async (tenantId: string, nombre: string) => {
      const cuentaId = (
        await e.admin.cuenta.create({ data: { tenantId, nombre: `Cliente ${nombre}` } })
      ).id;
      return (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre } })).id;
    };
    inst.A1 = await instalacion(t.A, "Planta 1");
    inst.A2 = await instalacion(t.A, "Planta 2");
    inst.B = await instalacion(t.B, "Planta B");
    const nov = (tenantId: string, instalacionId: string, resumen: string) =>
      e.admin.libroNovedad.create({ data: { tenantId, instalacionId, resumen, modulo: "rondas" } });
    for (const r of ["uno", "dos", "tres"]) await nov(t.A, inst.A1, r);
    await nov(t.A, inst.A2, "cuatro");
    await nov(t.B, inst.B, "beta");
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("lee por instalación con su código NOV y pagina sin repetir", async () => {
    const p = datos(await listar("A", { instalacionId: inst.A1, limite: 2 }));
    expect(p.items).toHaveLength(2);
    expect(p.items.every((x) => /^NOV-\d{4}$/.test(x.codigo))).toBe(true);
    expect(p.siguiente).not.toBeNull();
    const p2 = datos(await listar("A", { instalacionId: inst.A1, limite: 2, cursor: p.siguiente }));
    expect(p2.items).toHaveLength(1);
    expect(p2.siguiente).toBeNull();
    expect(p2.items.some((x) => p.items.some((y) => y.id === x.id))).toBe(false);
  });

  it("el supervisor ve su instalación y no la otra de la misma empresa", async () => {
    const todas = datos(await listar("A", {}, [inst.A2]));
    expect(todas.items.map((x) => x.instalacionId)).toEqual([inst.A2]);
    const otra = await listar("A", { instalacionId: inst.A1 }, [inst.A2]);
    expect(otra.ok ? null : otra.error.code).toBe("NOT_FOUND");
  });

  it("otra empresa no ve ni enumera nada", async () => {
    const ajena = await listar("B", { instalacionId: inst.A1 });
    expect(ajena.ok ? null : ajena.error.code).toBe("NOT_FOUND");
    const b = datos(await listar("B", {}));
    expect(b.items.map((x) => x.instalacionId)).toEqual([inst.B]);
    expect(b.items[0]?.codigo).toBe("NOV-0001");
  });

  it("la lectura queda auditada con los IDs de la página, sin el texto", async () => {
    const p = datos(await listar("A", { instalacionId: inst.A2 }));
    const ev = await e.admin.auditEvent.findMany({
      where: { tenantId: t.A, capability: "core.libro_novedades.listar" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    expect(ev[0]?.payload).toEqual({ ids: p.items.map((x) => x.id) });
    expect(JSON.stringify(ev[0]?.payload)).not.toContain("cuatro");
  });
});

// CAR-400 · si la fila del cursor deja de cumplir el filtro entre una página y otra, la página
// siguiente no pierde ninguna fila (antes `skip: 1` se comía la primera válida). Contra Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
type Capacidades = typeof ModuloCapacidades;
type Pagina = { items: { id: string; nombre: string }[]; siguiente: string | null };

describe.skipIf(!urlPropietario)("paginación por cursor sin saltos (CAR-400)", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tenantId = "";
  let userId = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const slug = `cur-${randomUUID().slice(0, 8)}`;
    tenantId = (await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "aseo" } })).id;
    userId = (await e.admin.user.create({ data: { name: "ana", email: `${slug}@x.test` } })).id;
    await e.admin.membership.create({
      data: { tenantId, userId, rol: "admin", portales: ["erp"] },
    });
    for (const nombre of ["Alfa", "Beta", "Gama"]) {
      await e.admin.etiqueta.create({ data: { tenantId, nombre, tono: "neutral", activa: true } });
    }
  });

  afterAll(async () => await e?.cerrar());

  const listar = async (input: Record<string, unknown>, id = "core.etiquetas.list") => {
    const ctx = mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "x", email: "x@x.test", platformRole: null },
      rol: "admin",
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
    });
    const r = await mod.executeCapability(ctx, id, input);
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as Pagina;
  };

  it("la fila del cursor sale del filtro y la siguiente página sigue en la correcta", async () => {
    const p1 = await listar({ limite: 1 });
    expect(p1.items.map((i) => i.nombre)).toEqual(["Alfa"]);
    await e.admin.etiqueta.updateMany({
      where: { tenantId, nombre: "Alfa" },
      data: { activa: false },
    });
    const p2 = await listar({ limite: 1, cursor: p1.siguiente });
    expect(p2.items.map((i) => i.nombre)).toEqual(["Beta"]);
    const p3 = await listar({ limite: 1, cursor: p2.siguiente });
    expect(p3.items.map((i) => i.nombre)).toEqual(["Gama"]);
    expect(p3.siguiente).toBeNull();
  });

  it("sin cambios entre páginas, recorre todo sin repetir", async () => {
    const vistos: string[] = [];
    let cursor: string | null = null;
    do {
      const p: Pagina = await listar({
        limite: 1,
        incluirInactivas: true,
        ...(cursor ? { cursor } : {}),
      });
      vistos.push(...p.items.map((i) => i.nombre));
      cursor = p.siguiente;
    } while (cursor);
    expect(vistos).toEqual(["Alfa", "Beta", "Gama"]);
  });

  it("instalaciones: si la del cursor se archiva, la lista sigue en vez de cortarse", async () => {
    const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cliente cursor" } }))
      .id;
    for (const nombre of ["Alfa", "Beta", "Gama"]) {
      await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre } });
    }
    const p1 = await listar({ limite: 1, cuentaId }, "core.instalaciones.list");
    expect(p1.items.map((i) => i.nombre)).toEqual(["Alfa"]);
    await e.admin.instalacion.updateMany({
      where: { tenantId, cuentaId, nombre: "Alfa" },
      data: { archivadaEn: new Date() },
    });
    const p2 = await listar(
      { limite: 1, cuentaId, cursor: p1.siguiente },
      "core.instalaciones.list",
    );
    expect(p2.items.map((i) => i.nombre)).toEqual(["Beta"]);
  });
});

// CAR-502 · Libro de novedades en el Portal Cliente contra Postgres real: el texto del guardia se ve solo si la cuenta
// lo tiene encendido (apagado por defecto), solo en las instalaciones del acceso y nunca de otra empresa.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { modulos } from "../../../modules/registry/src";

import type * as ModuloCapacidades from "../src";

type Libro = { instalacionNombre: string; items: { id: string; gravedad: string; resumen: string }[]; siguiente: string | null };

describe.skipIf(!urlPropietario)("Portal Cliente · libro de novedades (Postgres real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const sufijo = randomUUID().slice(0, 8);
  const t = { a: "", b: "" };
  const inst = { x1: "", x2: "", b1: "" };
  let cx = "";
  const u = { x: randomUUID(), b: randomUUID() };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarModulos(modulos);
    for (const k of ["a", "b"] as const)
      t[k] = (await e.admin.tenant.create({ data: { slug: `pcl-${k}-${sufijo}`, nombre: k, vertical: "seguridad" } })).id;
    cx = (await e.admin.cuenta.create({ data: { tenantId: t.a, nombre: "Cuenta" } })).id;
    const cb = (await e.admin.cuenta.create({ data: { tenantId: t.b, nombre: "Otra" } })).id;
    const instalacion = async (tenantId: string, cuentaId: string, nombre: string) =>
      (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre, estado: "activa" } })).id;
    inst.x1 = await instalacion(t.a, cx, "Planta");
    inst.x2 = await instalacion(t.a, cx, "Bodega");
    inst.b1 = await instalacion(t.b, cb, "Ajena");
    const novedad = (tenantId: string, instalacionId: string, gravedad: string, resumen: string, dia: string) =>
      e.admin.novedad.create({ data: { tenantId, instalacionId, gravedad, resumen, createdAt: new Date(`${dia}T15:00:00Z`) } });
    await novedad(t.a, inst.x1, "alta", "Portón forzado", "2026-10-05");
    await novedad(t.a, inst.x1, "baja", "Luz quemada", "2026-10-06");
    await novedad(t.a, inst.x1, "media", "De noviembre", "2026-11-03");
    await novedad(t.a, inst.x2, "media", "Fuera del acceso", "2026-10-07");
    await novedad(t.b, inst.b1, "alta", "De otra empresa", "2026-10-07");
    const acceso = async (tenantId: string, userId: string, cuentaId: string, instalacionId: string) => {
      await e.admin.user.create({ data: { id: userId, name: "c", email: `${userId}@prueba.cl` } });
      const m = await e.admin.membership.create({ data: { tenantId, userId, rol: "viewer", portales: ["cliente"] } });
      const a = await e.admin.accesoCliente.create({ data: { tenantId, membershipId: m.id, cuentaId } });
      await e.admin.accesoInstalacion.create({ data: { tenantId, accesoId: a.id, instalacionId } });
    };
    await acceso(t.a, u.x, cx, inst.x1);
    await acceso(t.b, u.b, cb, inst.b1);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (tenantId: string, userId: string) =>
    mod.crearContexto({
      tenantId, actor: { tipo: "user", id: userId }, usuario: { id: userId, nombre: "c", email: `${userId}@prueba.cl`, platformRole: null }, rol: "viewer", permisosRol: ["portal_cliente:read"],
      portal: "cliente", portalesMembresia: ["cliente"], modulosActivos: ["portal_cliente", "rondas"], medidor: { registrar: async () => undefined },
    });
  const libro = (c: ReturnType<typeof ctx>, input: Record<string, unknown>) =>
    mod.executeCapability(c, "portal_cliente.novedades.listar", { mes: "2026-10", ...input });

  it("apagado por defecto: el resumen no ofrece el libro y la lectura queda prohibida", async () => {
    const r = await mod.executeCapability(ctx(t.a, u.x), "portal_cliente.resumen.leer", { mes: "2026-10" });
    expect(r.ok && (r.data as { novedadesTexto: boolean }).novedadesTexto).toBe(false);
    const l = await libro(ctx(t.a, u.x), { instalacionId: inst.x1 });
    expect(!l.ok && l.error.code).toBe("FORBIDDEN");
  });

  it("encendido para la cuenta: ve el texto del mes solo de su instalación, con páginas", async () => {
    await e.admin.configPortalCuenta.create({
      data: { tenantId: t.a, cuentaId: cx, seccionesVisibles: ["cobertura", "rondas", "novedades", "novedades_texto"] },
    });
    const r = await mod.executeCapability(ctx(t.a, u.x), "portal_cliente.resumen.leer", { mes: "2026-10" });
    expect(r.ok && (r.data as { novedadesTexto: boolean }).novedadesTexto).toBe(true);
    const p1 = await libro(ctx(t.a, u.x), { instalacionId: inst.x1, limite: 1 });
    if (!p1.ok) throw new Error(JSON.stringify(p1.error));
    const d1 = p1.data as Libro;
    expect([d1.instalacionNombre, d1.items.map((n) => n.resumen)]).toEqual(["Planta", ["Luz quemada"]]);
    const p2 = await libro(ctx(t.a, u.x), { instalacionId: inst.x1, limite: 1, cursor: d1.siguiente });
    expect(p2.ok && (p2.data as Libro).items.map((n) => [n.resumen, n.gravedad])).toEqual([["Portón forzado", "alta"]]);
    expect(p2.ok && (p2.data as Libro).siguiente).toBeNull();
  });

  it("otra instalación de su cuenta, de otra empresa o un cursor ajeno no se revelan", async () => {
    for (const instalacionId of [inst.x2, inst.b1]) {
      const l = await libro(ctx(t.a, u.x), { instalacionId });
      expect(!l.ok && l.error.code).toBe("NOT_FOUND");
    }
    const ajeno = await e.admin.novedad.findFirstOrThrow({ where: { instalacionId: inst.x2 } });
    const l = await libro(ctx(t.a, u.x), { instalacionId: inst.x1, cursor: ajeno.id });
    expect(!l.ok && l.error.code).toBe("NOT_FOUND");
    const otra = await libro(ctx(t.b, u.b), { instalacionId: inst.b1 });
    expect(!otra.ok && otra.error.code).toBe("FORBIDDEN");
  });
});

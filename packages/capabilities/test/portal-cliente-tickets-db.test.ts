// CAR-519 · Tickets en el Portal Cliente contra Postgres real: apagados por defecto, encendidos por cuenta; el contacto
// abre tickets solo de las instalaciones de su acceso y con tipos marcados para clientes, y ve solo los suyos.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { modulos } from "../../../modules/registry/src";

import type * as ModuloCapacidades from "../src";

type Lista = { items: { id: string; titulo: string; estado: string; instalacion: string }[]; tipos: { id: string }[] };

describe.skipIf(!urlPropietario)("Portal Cliente · tickets (Postgres real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const sufijo = randomUUID().slice(0, 8);
  const t = { a: "", b: "" };
  const i: Record<string, string> = {};
  const tipo = { cliente: "", interno: "", ajeno: "", aprobacion: "" };
  let cx = "";
  let cb = "";
  const u = { x: randomUUID(), y: randomUUID(), b: randomUUID(), ger: randomUUID() };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarModulos(modulos);
    for (const k of ["a", "b"] as const)
      t[k] = (await e.admin.tenant.create({ data: { slug: `pct-${k}-${sufijo}`, nombre: k, vertical: "seguridad" } })).id;
    cx = (await e.admin.cuenta.create({ data: { tenantId: t.a, nombre: "Cuenta" } })).id;
    cb = (await e.admin.cuenta.create({ data: { tenantId: t.b, nombre: "Otra" } })).id;
    const inst = async (tenantId: string, cuentaId: string, nombre: string) =>
      (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre, estado: "activa" } })).id;
    i["planta"] = await inst(t.a, cx, "Planta");
    i["bodega"] = await inst(t.a, cx, "Bodega");
    i["ajena"] = await inst(t.b, cb, "Ajena");
    await e.admin.user.create({ data: { id: u.ger, name: "g", email: `${u.ger}@prueba.cl` } });
    await e.admin.membership.create({ data: { tenantId: t.a, userId: u.ger, rol: "gerente", portales: ["erp"] } });
    const mkTipo = (tenantId: string, nombre: string, roles: string[], requiereAprobacion = false) =>
      e.admin.tipoTicket.create({
        data: { tenantId, nombre, responsableDefectoRol: "gerente", rolesPermitidos: roles, requiereAprobacion, aprobadorRol: requiereAprobacion ? "admin" : null },
      });
    tipo.cliente = (await mkTipo(t.a, "Reclamo", ["cliente"])).id;
    tipo.interno = (await mkTipo(t.a, "Interno", [])).id;
    tipo.ajeno = (await mkTipo(t.b, "Reclamo", ["cliente"])).id;
    tipo.aprobacion = (await mkTipo(t.a, "Permiso", ["cliente"], true)).id;
    const acceso = async (tenantId: string, userId: string, cuentaId: string, instalacionId: string) => {
      await e.admin.user.create({ data: { id: userId, name: "c", email: `${userId}@prueba.cl` } });
      const m = await e.admin.membership.create({ data: { tenantId, userId, rol: "viewer", portales: ["cliente"] } });
      const a = await e.admin.accesoCliente.create({ data: { tenantId, membershipId: m.id, cuentaId } });
      await e.admin.accesoInstalacion.create({ data: { tenantId, accesoId: a.id, instalacionId } });
    };
    await acceso(t.a, u.x, cx, i["planta"]);
    await acceso(t.a, u.y, cx, i["planta"]);
    await acceso(t.b, u.b, cb, i["ajena"]);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (tenantId: string, userId: string) =>
    mod.crearContexto({
      tenantId, actor: { tipo: "user", id: userId }, usuario: { id: userId, nombre: "c", email: `${userId}@prueba.cl`, platformRole: null }, rol: "viewer", permisosRol: ["portal_cliente:read"],
      portal: "cliente", portalesMembresia: ["cliente"], modulosActivos: ["portal_cliente", "tickets"], medidor: { registrar: async () => undefined },
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown) => mod.executeCapability(c, id, input);
  const abrir = (c: ReturnType<typeof ctx>, instalacionId: string, tipoId: string) =>
    run(c, "tickets.portal_tickets.crear", { instalacionId, tipoId, titulo: "Portón trabado", descripcion: "No abre desde ayer" });

  it("apagados por defecto: el resumen no los ofrece y abrir uno queda prohibido", async () => {
    const r = await run(ctx(t.a, u.x), "portal_cliente.resumen.leer", {});
    expect(r.ok && (r.data as { tickets: boolean }).tickets).toBe(false);
    const c = await abrir(ctx(t.a, u.x), i["planta"]!, tipo.cliente);
    expect(!c.ok && c.error.code).toBe("FORBIDDEN");
  });

  it("encendidos: abre un ticket de su instalación, lo recibe el responsable del tipo y solo él lo ve", async () => {
    await e.admin.configPortalCuenta.create({ data: { tenantId: t.a, cuentaId: cx, seccionesVisibles: ["cobertura", "tickets"] } });
    const c = await abrir(ctx(t.a, u.x), i["planta"]!, tipo.cliente);
    if (!c.ok) throw new Error(JSON.stringify(c.error));
    const fila = await e.admin.ticket.findUniqueOrThrow({ where: { id: (c.data as { id: string }).id } });
    expect([fila.responsableId, fila.solicitanteId, fila.instalacionId, fila.estado]).toEqual([u.ger, u.x, i["planta"], "abierto"]);
    const l = await run(ctx(t.a, u.x), "tickets.portal_tickets.listar", {});
    if (!l.ok) throw new Error(JSON.stringify(l.error));
    const d = l.data as Lista;
    expect(d.items.map((x) => [x.titulo, x.estado, x.instalacion])).toEqual([["Portón trabado", "abierto", "Planta"]]);
    const leido = await e.admin.auditEvent.findFirst({ where: { tenantId: t.a, capability: "tickets.portal_tickets.listar" }, orderBy: { seq: "desc" } });
    expect(JSON.stringify(leido)).toContain(d.items[0]!.id);
    expect(d.tipos.map((x) => x.id)).toEqual([tipo.cliente]);
    const otro = await run(ctx(t.a, u.y), "tickets.portal_tickets.listar", {});
    expect(otro.ok && (otro.data as Lista).items).toEqual([]);
  });

  it("otra instalación, un tipo interno, con aprobación o de otra empresa no existen", async () => {
    const casos = [[i["bodega"]!, tipo.cliente], [i["ajena"]!, tipo.cliente], [i["planta"]!, tipo.interno], [i["planta"]!, tipo.aprobacion], [i["planta"]!, tipo.ajeno]];
    for (const [inst, tp] of casos) {
      const c = await abrir(ctx(t.a, u.x), inst!, tp!);
      expect(!c.ok && c.error.code).toBe("NOT_FOUND");
    }
  });

  it("la otra empresa, con los tickets encendidos, no ve los de la primera; una sesión del ERP no entra", async () => {
    await e.admin.configPortalCuenta.create({ data: { tenantId: t.b, cuentaId: cb, seccionesVisibles: ["tickets"] } });
    const b = await run(ctx(t.b, u.b), "tickets.portal_tickets.listar", {});
    if (!b.ok) throw new Error(JSON.stringify(b.error));
    expect((b.data as Lista).items).toEqual([]);
    expect((b.data as Lista).tipos.map((x) => x.id)).toEqual([tipo.ajeno]);
    const erp = mod.crearContexto({
      tenantId: t.a, actor: { tipo: "user", id: u.ger }, usuario: { id: u.ger, nombre: "g", email: `${u.ger}@prueba.cl`, platformRole: null },
      rol: "gerente", portal: "erp", portalesMembresia: ["erp"], modulosActivos: ["portal_cliente", "tickets"], medidor: { registrar: async () => undefined },
    });
    const r = await mod.executeCapability(erp, "tickets.portal_tickets.listar", {}, {});
    expect(!r.ok && r.error.code).toBe("FORBIDDEN");
  });

  it("un tipo abierto a clientes sigue disponible para el ERP", async () => {
    const ger = mod.crearContexto({
      tenantId: t.a, actor: { tipo: "user", id: u.ger }, usuario: { id: u.ger, nombre: "g", email: `${u.ger}@prueba.cl`, platformRole: null },
      rol: "gerente", portal: "erp", portalesMembresia: ["erp"], modulosActivos: ["tickets"], medidor: { registrar: async () => undefined },
    });
    const l = await mod.executeCapability(ger, "tickets.tipos.listar", {}, {});
    expect(l.ok && (l.data as { id: string }[]).map((x) => x.id).sort()).toEqual([tipo.cliente, tipo.interno, tipo.aprobacion].sort());
  });

  it("la empresa puede apagarlos para todos", async () => {
    const owner = mod.crearContexto({
      tenantId: t.a, actor: { tipo: "system" }, rol: "owner", portal: "erp", portalesMembresia: ["erp"],
      modulosActivos: ["portal_cliente", "tickets"], medidor: { registrar: async () => undefined },
    });
    const set = await mod.executeCapability(owner, "core.config.set", { modulo: "portal_cliente", clave: "seccion_tickets", valor: false }, {});
    expect(set.ok, JSON.stringify(set)).toBe(true);
    const l = await run(ctx(t.a, u.x), "tickets.portal_tickets.listar", {});
    expect(!l.ok && l.error.code).toBe("FORBIDDEN");
  });
});

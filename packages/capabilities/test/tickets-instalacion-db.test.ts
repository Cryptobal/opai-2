// CAR-84 (PR 2 del Brief 13): un ticket puede referirse a una instalación. Solo de la misma empresa, dentro del alcance
// de quien crea, y la bandeja se filtra por instalación. Solo datos ficticios (empresas qa-tkin*).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest as manifestTickets } from "../../../modules/tickets/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as Mod from "../src";

describe.skipIf(omitirSuiteDb())("tickets · instalación del ticket (CAR-84)", () => {
  let e: Entorno, mod: typeof Mod;
  const t = { a: "", b: "" };
  const u = { ger: randomUUID(), sup: randomUUID() };
  const inst: Record<string, string> = {};
  let tipoId = "";
  const ctx = (uid: string, rol: "gerente" | "supervisor", tid: string, instalaciones?: string[]) =>
    mod.crearContexto({
      ...(instalaciones ? { alcance: { instalaciones } } : {}),
      tenantId: tid, actor: { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@tkin.test`, platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol, modulosActivos: ["tickets"], medidor: { registrar: async () => undefined },
    });
  const crear = (c: ReturnType<typeof ctx>, instalacionId?: string) =>
    mod.executeCapability(c, "tickets.tickets.crear", { tipoId, titulo: "Portón trabado", descripcion: "No abre", ...(instalacionId ? { instalacionId } : {}) }, {});

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifestTickets]);
    const mk = (s: string) => e.admin.tenant.create({ data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" } });
    t.a = (await mk("qa-tkina")).id;
    t.b = (await mk("qa-tkinb")).id;
    for (const [id, rol] of [[u.ger, "gerente"], [u.sup, "supervisor"]] as const) {
      await e.admin.user.create({ data: { id, name: `P ${id.slice(0, 4)}`, email: `${id.slice(0, 8)}@tkin.test` } });
      await e.admin.membership.create({ data: { tenantId: t.a, userId: id, rol, portales: ["erp"] } });
    }
    for (const [k, tenantId] of [["norte", t.a], ["sur", t.a], ["beta", t.b]] as const) {
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: `Cliente ${k}` } })).id;
      inst[k] = (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre: `Bodega ${k}` } })).id;
    }
    tipoId = (await e.admin.tipoTicket.create({ data: { tenantId: t.a, nombre: "Mantención", responsableDefectoTipo: "usuario", responsableDefectoUsuarioId: u.ger } })).id;
  });
  afterAll(async () => { await e?.cerrar(); });

  it("crea el ticket con su instalación y la bandeja filtra por ella", async () => {
    const c = ctx(u.ger, "gerente", t.a);
    const r = await crear(c, inst["norte"]);
    expect(r.ok).toBe(true);
    await crear(c, inst["sur"]);
    const l = await mod.executeCapability(c, "tickets.tickets.listar", { vista: "todos", instalacionId: inst["norte"] }, {});
    if (!l.ok) throw new Error(JSON.stringify(l.error));
    const items = (l.data as { items: { instalacionId: string | null }[] }).items;
    expect(items.map((x) => x.instalacionId)).toEqual([inst["norte"]]);
  });

  it("una instalación de otra empresa o fuera del alcance del supervisor no existe", async () => {
    const otra = await crear(ctx(u.ger, "gerente", t.a), inst["beta"]);
    expect(otra.ok ? null : otra.error.code).toBe("NOT_FOUND");
    const fuera = await crear(ctx(u.sup, "supervisor", t.a, [inst["sur"]!]), inst["norte"]);
    expect(fuera.ok ? null : fuera.error.code).toBe("NOT_FOUND");
    const dentro = await crear(ctx(u.sup, "supervisor", t.a, [inst["sur"]!]), inst["sur"]);
    expect(dentro.ok).toBe(true);
  });

  it("la base rechaza una instalación de otra empresa aunque se salte la capacidad", async () => {
    await expect(
      e.admin.ticket.create({ data: { tenantId: t.a, tipoId, titulo: "x", descripcion: "x", solicitanteId: u.ger, responsableId: u.ger, instalacionId: inst["beta"]! } }),
    ).rejects.toThrow();
  });
});

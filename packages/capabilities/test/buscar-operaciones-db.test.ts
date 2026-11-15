// CAR-404: la búsqueda global encuentra tickets (por asunto) y puestos (por nombre o instalación), con el permiso
// y el alcance de quien busca y sin cruzar empresas. Solo datos ficticios (empresas qa-buso*).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest as manifestPauta } from "../../../modules/pauta/manifest";
import { manifest as manifestTickets } from "../../../modules/tickets/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as Mod from "../src";

type Rol = "owner" | "gerente" | "supervisor";
type Grupo = { grupo: string; items: { id: string; titulo: string; detalle: string | null; href: string }[] };

describe.skipIf(omitirSuiteDb())("core.buscar · aporte de Operaciones (CAR-404)", () => {
  let e: Entorno, mod: typeof Mod;
  const t = { a: "", b: "" };
  const u = { ger: randomUUID(), pide: randomUUID(), sup: randomUUID(), dueB: randomUUID() };
  const r: Record<string, string> = {};
  const ctx = (uid: string, rol: Rol, tid: string, extra: { permisosRol?: string[]; instalaciones?: string[] } = {}) =>
    mod.crearContexto({
      ...(extra.permisosRol ? { permisosRol: extra.permisosRol } : {}),
      ...(extra.instalaciones ? { alcance: { instalaciones: extra.instalaciones } } : {}),
      tenantId: tid, actor: { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@buso.test`, platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol, modulosActivos: ["pauta", "tickets"], medidor: { registrar: async () => undefined },
    });
  const buscar = async (c: ReturnType<typeof ctx>, q: string, grupo: string) => {
    const res = await mod.executeCapability(c, "core.buscar", { q }, {});
    if (!res.ok) throw new Error(JSON.stringify(res.error));
    return (res.data as { otros: Grupo[] }).otros.find((g) => g.grupo === grupo)?.items ?? null;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifestPauta, manifestTickets]);
    const mk = (s: string) => e.admin.tenant.create({ data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" } });
    t.a = (await mk("qa-busoa")).id;
    t.b = (await mk("qa-busob")).id;
    for (const [id, tid, rol] of [[u.ger, t.a, "gerente"], [u.pide, t.a, "gerente"], [u.sup, t.a, "supervisor"], [u.dueB, t.b, "owner"]] as const) {
      await e.admin.user.create({ data: { id, name: `Persona ${id.slice(0, 4)}`, email: `${id.slice(0, 8)}@buso.test` } });
      await e.admin.membership.create({ data: { tenantId: tid, userId: id, rol, portales: ["erp"] } });
    }
    const puesto = async (k: string, tenantId: string, instalacion: string, nombre: string) => {
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: `Cliente ${k}` } })).id;
      const instalacionId = (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre: instalacion } })).id;
      const cargoId = (await e.admin.cargo.create({ data: { tenantId, nombre: `Guardia ${k}` } })).id;
      r[`inst_${k}`] = instalacionId;
      r[k] = (await e.admin.puesto.create({
        data: { tenantId, instalacionId, cargoId, nombre, diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00" },
      })).id;
    };
    await puesto("norte", t.a, "Bodega Zafiro Norte", "Portería día");
    await puesto("sur", t.a, "Planta Sur", "Zafiro ronda noche");
    await puesto("beta", t.b, "Bodega Zafiro Norte", "Portería día");
    const tipo = async (tenantId: string) => (await e.admin.tipoTicket.create({ data: { tenantId, nombre: "Consulta" } })).id;
    const tipoA = await tipo(t.a);
    const ticket = async (k: string, tenantId: string, tipoId: string, solicitanteId: string, responsableId: string) => {
      r[k] = (await e.admin.ticket.create({ data: { tenantId, tipoId, titulo: "Cambio de turno Zafiro", descripcion: "—", solicitanteId, responsableId } })).id;
    };
    await ticket("tPide", t.a, tipoA, u.pide, u.ger);
    await ticket("tOtro", t.a, tipoA, u.ger, u.ger);
    await ticket("tBeta", t.b, await tipo(t.b), u.dueB, u.dueB);
  });
  afterAll(async () => { await e?.cerrar(); });

  it("con «ver todos», encuentra los tickets de la empresa por asunto, con tipo y estado, y nada de otra", async () => {
    const items = await buscar(ctx(u.ger, "gerente", t.a), "zafiro", "tickets");
    expect(items?.map((x) => x.id).sort()).toEqual([r["tPide"], r["tOtro"]].sort());
    expect(items?.find((x) => x.id === r["tPide"])).toEqual({ id: r["tPide"], titulo: "Cambio de turno Zafiro", detalle: "Consulta · Abierto", href: `/tickets/${r["tPide"]}` });
    expect(JSON.stringify(items)).not.toContain(r["tBeta"]!);
  });

  it("sin «ver todos», solo los tickets que pidió o tiene a cargo", async () => {
    const items = await buscar(ctx(u.pide, "gerente", t.a, { permisosRol: ["tickets:tickets.ver"] }), "zafiro", "tickets");
    expect(items?.map((x) => x.id)).toEqual([r["tPide"]]);
  });

  it("encuentra puestos por su nombre o por el de su instalación, sin cruzar empresas", async () => {
    const items = await buscar(ctx(u.ger, "gerente", t.a), "zafiro", "puestos");
    expect(items?.map((x) => x.id).sort()).toEqual([r["norte"], r["sur"]].sort());
    expect(items?.find((x) => x.id === r["norte"])).toEqual({
      id: r["norte"], titulo: "Portería día", detalle: "Bodega Zafiro Norte · Por cubrir", href: `/instalaciones/${r["inst_norte"]}/puestos?puesto=${r["norte"]}`,
    });
    expect(JSON.stringify(items)).not.toContain(r["beta"]!);
  });

  it("el supervisor solo ve los puestos de sus instalaciones", async () => {
    const items = await buscar(ctx(u.sup, "supervisor", t.a, { instalaciones: [r["inst_sur"]!] }), "zafiro", "puestos");
    expect(items?.map((x) => x.id)).toEqual([r["sur"]]);
  });

  it("sin el permiso de cada módulo no aparece su grupo", async () => {
    const sin = await buscar(ctx(u.pide, "gerente", t.a, { permisosRol: ["core:instalaciones.read"] }), "zafiro", "tickets");
    expect(sin).toBeNull();
    const sinPauta = await buscar(ctx(u.pide, "gerente", t.a, { permisosRol: ["tickets:tickets.ver"] }), "zafiro", "puestos");
    expect(sinPauta).toBeNull();
  });
});

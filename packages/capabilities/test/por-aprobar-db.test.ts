// CAR-253 (decisión de Carlos del 12-nov-2026, opción A): bandeja única «Por aprobar». Cada módulo
// conserva su flujo y su criterio de quién aprueba; el núcleo solo junta lo que espera al actor.
// Con Postgres real: Rendiciones (aprobador asignado), Tickets (rol aprobador del tipo), permisos y
// aislamiento entre empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest as rendiciones } from "../../../modules/rendiciones/manifest";
import { manifest as tickets } from "../../../modules/tickets/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Grupos = {
  total: number;
  grupos: { origen: string; total: number; items: { id: string; href: string }[] }[];
};

describe.skipIf(omitirSuiteDb())("Por aprobar · bandeja única (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  let rendicionId = "";
  let ticketId = "";
  const rinde = randomUUID();
  const gerente = randomUUID();
  const ajeno = randomUUID();

  const ctx = (uid: string, rol: "supervisor" | "gerente", tid = tenantA) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: uid },
      usuario: {
        id: uid,
        nombre: "Prueba",
        email: `${uid.slice(0, 6)}@pa.test`,
        platformRole: null,
      },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol,
      modulosActivos: ["rendiciones", "tickets"],
      medidor: { registrar: async () => undefined },
    });
  const leer = async (uid: string, rol: "supervisor" | "gerente", tid?: string) => {
    const r = await mod.executeCapability(ctx(uid, rol, tid), "core.por_aprobar.list", {});
    if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
    return r.data as Grupos;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([rendiciones, tickets]);
    const t = (slug: string) =>
      e.admin.tenant.create({
        data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" },
      });
    tenantA = (await t("pa-a")).id;
    tenantB = (await t("pa-b")).id;
    for (const [id, rol, tid] of [
      [rinde, "supervisor", tenantA],
      [gerente, "gerente", tenantA],
      [ajeno, "gerente", tenantB],
    ] as const) {
      await e.admin.user.create({ data: { id, name: rol, email: `${id.slice(0, 8)}@pa.test` } });
      await e.admin.membership.create({
        data: { tenantId: tid, userId: id, rol, portales: ["erp"] },
      });
    }
    const rendicion = await e.admin.rendicion.create({
      data: {
        tenantId: tenantA,
        codigo: 1,
        solicitanteId: rinde,
        aprobadorId: gerente,
        montoTotal: 12_000,
        estado: "enviada",
        enviadaEn: new Date(),
        descripcion: "Compras",
        centroCosto: "administracion",
      },
    });
    rendicionId = rendicion.id;
    const tipo = await e.admin.tipoTicket.create({
      data: {
        tenantId: tenantA,
        nombre: "Compra de insumos",
        requiereAprobacion: true,
        aprobadorRol: "gerente",
      },
    });
    const sinAprobacion = await e.admin.tipoTicket.create({
      data: { tenantId: tenantA, nombre: "Consulta" },
    });
    const ticket = (tipoId: string, titulo: string) =>
      e.admin.ticket.create({
        data: {
          tenantId: tenantA,
          tipoId,
          titulo,
          descripcion: "—",
          solicitanteId: rinde,
          responsableId: gerente,
        },
      });
    ticketId = (await ticket(tipo.id, "Guantes")).id;
    await ticket(sinAprobacion.id, "Duda");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("el aprobador ve en un solo lugar lo de Rendiciones y Tickets, con su enlace", async () => {
    const r = await leer(gerente, "gerente");
    const grupo = (o: string) => r.grupos.find((g) => g.origen === o);
    expect(grupo("rendiciones")).toMatchObject({
      total: 1,
      items: [{ id: rendicionId, href: `/rendiciones/bandeja/${rendicionId}` }],
    });
    expect(grupo("tickets")).toMatchObject({
      total: 1,
      items: [{ id: ticketId, href: `/tickets/${ticketId}` }],
    });
    expect(r.total).toBe(r.grupos.reduce((s, g) => s + g.total, 0));
  });

  it("el contador de la Bandeja cuenta lo mismo que la bandeja única", async () => {
    const c = await mod.executeCapability(ctx(gerente, "gerente"), "core.resumen.contadores", {
      campos: ["aprobacionesPendientes"],
    });
    expect(c).toMatchObject({
      ok: true,
      data: { aprobacionesPendientes: (await leer(gerente, "gerente")).total },
    });
  });

  it("quien no aprueba no ve nada; otra empresa tampoco", async () => {
    expect((await leer(rinde, "supervisor")).grupos).toEqual([]);
    expect((await leer(ajeno, "gerente", tenantB)).grupos).toEqual([]);
  });
});

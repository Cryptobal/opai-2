// CAR-84 (PR 2 del Brief 13): avisos de Tickets en la campana. Al responsable cuando un ticket queda a su cargo y a quien
// lo pidió cuando avanza; nunca a quien hizo el cambio, sin duplicar en reintentos y sin cruzar empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { consumidorTicketsAvisos } from "../../../modules/tickets/consumidor-avisos";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as Mod from "../src";

describe.skipIf(omitirSuiteDb())("tickets.avisos (CAR-84)", () => {
  let e: Entorno, mod: typeof Mod;
  const u = { pide: randomUUID(), atiende: randomUUID(), otro: randomUUID(), fuera: randomUUID() };
  let tenantId = "", otroTenant = "", ticketId = "";
  const ctx = (tid: string) => mod.crearContexto({ tenantId: tid, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["tickets"], medidor: { registrar: async () => undefined } });
  // Evento real en el outbox: la notificación tiene FK a él.
  const ev = async (tipo: string, actorId: string | null, payload: object = {}, tid = tenantId) => {
    const fila = await e.admin.evento.create({ data: { tenantId: tid, tipo, entidadTipo: "ticket", entidadId: ticketId, payload, actorTipo: "user", actorId } });
    return { ...fila, payload: fila.payload as unknown };
  };
  const avisos = (usuarioId: string, tid = tenantId) => e.admin.notificacion.findMany({ where: { tenantId: tid, usuarioId }, orderBy: { createdAt: "asc" } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    const mk = (s: string) => e.admin.tenant.create({ data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" } });
    tenantId = (await mk("qa-tava")).id;
    otroTenant = (await mk("qa-tavb")).id;
    for (const [id, tid, estado] of [[u.pide, tenantId, "activa"], [u.atiende, tenantId, "activa"], [u.otro, tenantId, "activa"], [u.fuera, tenantId, "suspendida"]] as const) {
      await e.admin.user.create({ data: { id, name: `Persona ${id.slice(0, 4)}`, email: `${id.slice(0, 8)}@tav.test` } });
      await e.admin.membership.create({ data: { tenantId: tid, userId: id, rol: "gerente", portales: ["erp"], estado } });
    }
    const tipoId = (await e.admin.tipoTicket.create({ data: { tenantId, nombre: "Consulta" } })).id;
    ticketId = (await e.admin.ticket.create({ data: { tenantId, tipoId, titulo: "Falta linterna", descripcion: "—", solicitanteId: u.pide, responsableId: u.atiende } })).id;
  });
  afterAll(async () => { await e?.cerrar(); });

  it("al crear, avisa al responsable con enlace a la ficha, una sola vez aunque el despacho reintente", async () => {
    const creado = await ev("tickets.ticket.creado", u.pide);
    await consumidorTicketsAvisos.handler(ctx(tenantId), creado);
    await consumidorTicketsAvisos.handler(ctx(tenantId), creado);
    const n = await avisos(u.atiende);
    expect(n.map((x) => [x.titulo, x.cuerpo, x.enlace])).toEqual([["Tienes un ticket nuevo", "«Falta linterna» quedó a tu cargo.", `/tickets/${ticketId}`]]);
    expect(await avisos(u.pide)).toEqual([]);
  });

  it("al cambiar de estado o resolver, avisa a quien lo pidió con el estado del evento", async () => {
    await consumidorTicketsAvisos.handler(ctx(tenantId), await ev("tickets.ticket.estado_cambiado", u.atiende, { de: "abierto", a: "en_curso" }));
    await consumidorTicketsAvisos.handler(ctx(tenantId), await ev("tickets.ticket.rechazado", u.atiende));
    expect((await avisos(u.pide)).map((x) => x.cuerpo)).toEqual([
      "«Falta linterna» está en curso.",
      "«Falta linterna» fue rechazada. Revisa el motivo en la ficha.",
    ]);
  });

  it("no avisa a quien hizo el cambio ni a una membresía suspendida", async () => {
    await consumidorTicketsAvisos.handler(ctx(tenantId), await ev("tickets.ticket.estado_cambiado", u.pide, { a: "cerrado" }));
    expect(await avisos(u.pide)).toHaveLength(2);
    await consumidorTicketsAvisos.handler(ctx(tenantId), await ev("tickets.ticket.reasignado", u.atiende, { responsableId: u.fuera }));
    expect(await avisos(u.fuera)).toEqual([]);
  });

  it("al reasignar, avisa al nuevo responsable", async () => {
    await consumidorTicketsAvisos.handler(ctx(tenantId), await ev("tickets.ticket.reasignado", u.atiende, { responsableId: u.otro }));
    expect((await avisos(u.otro)).map((x) => x.titulo)).toEqual(["Te asignaron un ticket"]);
  });

  it("desde otra empresa no encuentra el ticket y no avisa", async () => {
    await consumidorTicketsAvisos.handler(ctx(otroTenant), await ev("tickets.ticket.creado", u.pide, {}, otroTenant));
    expect(await avisos(u.atiende, otroTenant)).toEqual([]);
  });
});

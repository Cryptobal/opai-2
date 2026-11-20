// CAR-622: trabajo de SLA vencido con reloj inyectado y aviso único al responsable.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { consumidorTicketsAvisos } from "../../../modules/tickets/consumidor-avisos";
import { manifest as manifestTickets } from "../../../modules/tickets/manifest";
import { trabajoTicketsSla } from "../../../modules/tickets/trabajo-sla";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as Mod from "../src";

describe.skipIf(omitirSuiteDb())("tickets.sla.vencidos (CAR-622)", () => {
  let e: Entorno;
  let mod: typeof Mod;
  const u = { pide: randomUUID(), atiende: randomUUID() };
  let tenantId = "";
  let ticketId = "";
  const ctx = (activo = true) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      modulosActivos: activo ? ["tickets"] : [],
      medidor: { registrar: async () => undefined },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarModulos([manifestTickets]);
    const t = await e.admin.tenant.create({
      data: { slug: `qa-tsla-${randomUUID().slice(0, 8)}`, nombre: "QA SLA", vertical: "seguridad" },
    });
    tenantId = t.id;
    for (const [id, name] of [
      [u.pide, "Quie Pide"],
      [u.atiende, "Quien Atiende"],
    ] as const) {
      await e.admin.user.create({ data: { id, name, email: `${id.slice(0, 8)}@tsla.test` } });
      await e.admin.membership.create({
        data: { tenantId, userId: id, rol: "gerente", portales: ["erp"], estado: "activa" },
      });
    }
    const tipoId = (await e.admin.tipoTicket.create({ data: { tenantId, nombre: "SLA", slaHoras: 1 } })).id;
    const vence = new Date("2026-11-17T12:00:00.000Z");
    ticketId = (
      await e.admin.ticket.create({
        data: {
          tenantId,
          tipoId,
          titulo: "Ticket con SLA",
          descripcion: "—",
          solicitanteId: u.pide,
          responsableId: u.atiende,
          slaVenceEn: vence,
          createdAt: new Date("2026-11-17T10:00:00.000Z"),
        },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("emite un evento y avisa al responsable una sola vez", async () => {
    const ahora = "2026-11-17T13:00:00.000Z";
    expect(await trabajoTicketsSla.ejecutar(ctx(false), { ahora })).toEqual({ avisados: 0 });
    const respuestas = await Promise.all([
      trabajoTicketsSla.ejecutar(ctx(), { ahora }),
      trabajoTicketsSla.ejecutar(ctx(), { ahora }),
    ]);
    expect(respuestas).toContainEqual({ avisados: 1 });
    expect(respuestas).toContainEqual({ avisados: 0 });

    const ev = await e.admin.evento.findMany({
      where: { tenantId, tipo: "tickets.ticket.sla_vencido", entidadId: ticketId },
    });
    expect(ev).toHaveLength(1);

    expect(ev[0]).toMatchObject({ actorTipo: "system", actorId: null });
    expect(await e.admin.ticketEvento.count({ where: { ticketId, tipo: "sla_vencido" } })).toBe(0);

    await consumidorTicketsAvisos.handler(ctx(false), ev[0]!);
    expect(await e.admin.notificacion.count({ where: { tenantId, usuarioId: u.atiende } })).toBe(0);
    await consumidorTicketsAvisos.handler(ctx(), ev[0]!);
    await consumidorTicketsAvisos.handler(ctx(), ev[0]!);
    const avisos = await e.admin.notificacion.findMany({ where: { tenantId, usuarioId: u.atiende } });
    expect(avisos).toHaveLength(1);
    expect(avisos[0]?.titulo).toBe("SLA vencido en un ticket");
  });
});

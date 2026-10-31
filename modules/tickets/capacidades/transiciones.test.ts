import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ACTIVOS, semilla, SOLICITUD_1, TICKET_1, ticketFila, TIPO_SOLICITUD_ID } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => {
  registrarCapacidades(capacidades);
});

describe("transiciones y aprobación", () => {
  it("el responsable puede resolver un ticket abierto, pero no saltar a cerrado directo", async () => {
    const { ctx } = contextoDePrueba({
      semilla: { ...semilla(), ticket: [ticketFila({ responsableId: USUARIO_DE_PRUEBA.id })] },
      modulosActivos: ACTIVOS,
      permisos: ["tickets:tickets.ver", "tickets:tickets.gestionar"],
    });
    const saltar = await executeCapability(ctx, "tickets.tickets.cambiar_estado", {
      id: TICKET_1,
      estado: "cerrado",
    });
    expect(saltar).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const ok = await executeCapability(ctx, "tickets.tickets.cambiar_estado", {
      id: TICKET_1,
      estado: "en_curso",
    });
    expect(ok).toMatchObject({ ok: true });
  });

  it("solo el aprobador del tipo aprueba una solicitud (un viewer no)", async () => {
    const { ctx } = contextoDePrueba({
      semilla: {
        ...semilla(),
        ticket: [
          ticketFila({
            id: SOLICITUD_1,
            tipoId: TIPO_SOLICITUD_ID,
            solicitanteId: USUARIO_DE_PRUEBA.id,
          }),
        ],
      },
      modulosActivos: ACTIVOS,
      rol: "viewer",
      permisos: ["tickets:tickets.ver", "tickets:tickets.gestionar"],
    });
    const negado = await executeCapability(ctx, "tickets.tickets.aprobar", { id: SOLICITUD_1 });
    expect(negado).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("rechazar exige un motivo y deja el ticket en estado rechazado", async () => {
    const { ctx } = contextoDePrueba({
      semilla: { ...semilla(), ticket: [ticketFila({ id: SOLICITUD_1, tipoId: TIPO_SOLICITUD_ID })] },
      modulosActivos: ACTIVOS,
      rol: "supervisor",
      permisos: ["tickets:tickets.ver", "tickets:tickets.gestionar"],
    });
    const r = await executeCapability(ctx, "tickets.tickets.rechazar", {
      id: SOLICITUD_1,
      motivo: "Sin cupo en enero",
    });
    expect(r).toMatchObject({ ok: true });
    const t = await ctx.db.ticket.findFirst({ where: { id: SOLICITUD_1 } });
    expect(t).toMatchObject({ estado: "rechazado", motivoRechazo: "Sin cupo en enero" });
  });

  describe("R-TCK-006: ver_todos no reemplaza al aprobador", () => {
    const solicitud = () => ({ ...semilla(), ticket: [ticketFila({ id: SOLICITUD_1, tipoId: TIPO_SOLICITUD_ID })] });
    const PERMISOS = ["tickets:tickets.ver", "tickets:tickets.ver_todos", "tickets:tickets.gestionar"];

    it.each([
      ["aprobar", { id: SOLICITUD_1 }],
      ["rechazar", { id: SOLICITUD_1, motivo: "Sin cupo en enero" }],
    ])("%s: ver_todos + gestionar con otro rol da FORBIDDEN, también en dry_run, y no cambia nada", async (accion, input) => {
      // El tipo de solicitud lo aprueba "supervisor"; el actor es "admin" con ver_todos.
      const { ctx } = contextoDePrueba({
        semilla: solicitud(),
        modulosActivos: ACTIVOS,
        rol: "admin",
        permisos: PERMISOS,
      });
      for (const dryRun of [false, true]) {
        const r = await executeCapability(ctx, `tickets.tickets.${accion}`, input, { dryRun });
        expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      }
      const t = await ctx.db.ticket.findFirst({ where: { id: SOLICITUD_1 } });
      expect(t).toMatchObject({ estado: "abierto", motivoRechazo: null });
    });

    it.each([
      ["aprobar", { id: SOLICITUD_1 }],
      ["rechazar", { id: SOLICITUD_1, motivo: "Sin cupo en enero" }],
    ])("%s: un supervisor con ver_todos no resuelve una solicitud que aprueba admin, ni en dry_run", async (accion, input) => {
      const base = solicitud();
      const semillaAdmin = {
        ...base,
        tipoTicket: base.tipoTicket.map((t) => (t.id === TIPO_SOLICITUD_ID ? { ...t, aprobadorRol: "admin" } : t)),
      };
      const { ctx } = contextoDePrueba({
        semilla: semillaAdmin,
        modulosActivos: ACTIVOS,
        rol: "supervisor",
        permisos: PERMISOS,
      });
      for (const dryRun of [false, true]) {
        const r = await executeCapability(ctx, `tickets.tickets.${accion}`, input, { dryRun });
        expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      }
      expect(await ctx.db.ticket.findFirst({ where: { id: SOLICITUD_1 } })).toMatchObject({ estado: "abierto" });
    });

    it("el rol aprobador sí aprueba, aunque no vea todos los tickets", async () => {
      const { ctx } = contextoDePrueba({
        semilla: solicitud(),
        modulosActivos: ACTIVOS,
        rol: "supervisor",
        permisos: ["tickets:tickets.ver", "tickets:tickets.gestionar"],
      });
      const r = await executeCapability(ctx, "tickets.tickets.aprobar", { id: SOLICITUD_1 });
      expect(r).toMatchObject({ ok: true });
      expect(await ctx.db.ticket.findFirst({ where: { id: SOLICITUD_1 } })).toMatchObject({ estado: "resuelto" });
    });
  });
});

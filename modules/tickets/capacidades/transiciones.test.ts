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

  it("solo el aprobador del tipo (o quien ve todos) aprueba una solicitud", async () => {
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
      permisos: ["tickets:tickets.ver", "tickets:tickets.ver_todos", "tickets:tickets.gestionar"],
    });
    const r = await executeCapability(ctx, "tickets.tickets.rechazar", {
      id: SOLICITUD_1,
      motivo: "Sin cupo en enero",
    });
    expect(r).toMatchObject({ ok: true });
    const t = await ctx.db.ticket.findFirst({ where: { id: SOLICITUD_1 } });
    expect(t).toMatchObject({ estado: "rechazado", motivoRechazo: "Sin cupo en enero" });
  });
});

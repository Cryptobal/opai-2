import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ACTIVOS, OTRO_USUARIO, semilla, TICKET_1, ticketFila, TIPO_ID } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => {
  registrarCapacidades(capacidades);
});

describe("tickets.tickets.crear", () => {
  it("crea un ticket con el responsable por defecto del tipo y su evento inicial", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    const r = await executeCapability(ctx, "tickets.tickets.crear", {
      tipoId: TIPO_ID,
      titulo: "Fuga de agua en bodega",
      descripcion: "Hay una fuga cerca del panel eléctrico.",
    });
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) throw new Error("unreachable");
    const { id } = r.data as { id: string };
    const t = await ctx.db.ticket.findFirst({ where: { id } });
    expect(t).toMatchObject({
      responsableId: OTRO_USUARIO,
      solicitanteId: USUARIO_DE_PRUEBA.id,
      estado: "abierto",
    });
    const eventos = await ctx.db.ticketEvento.findMany({ where: { ticketId: id } });
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ tipo: "creado" });
  });

  it("no deja crear con un tipo que no existe o está inactivo", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS });
    const r = await executeCapability(ctx, "tickets.tickets.crear", {
      tipoId: "0192f3a0-0000-7000-8000-0000000000ff",
      titulo: "Algo",
      descripcion: "Algo que no debería crearse.",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("deniega crear sin el permiso del módulo", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: [] });
    const r = await executeCapability(ctx, "tickets.tickets.crear", {
      tipoId: TIPO_ID,
      titulo: "Fuga de agua",
      descripcion: "Descripción cualquiera.",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

describe("alcance por fila: propios, asignados y de otra persona", () => {
  it("un usuario sin tickets.ver_todos no ve el ticket de otra persona por obtener()", async () => {
    const { ctx } = contextoDePrueba({
      semilla: { ...semilla(), ticket: [ticketFila({})] },
      modulosActivos: ACTIVOS,
      permisos: ["tickets:tickets.ver", "tickets:tickets.gestionar"],
    });
    const r = await executeCapability(ctx, "tickets.tickets.obtener", { id: TICKET_1 });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("alguien con tickets.ver_todos sí ve el ticket de otra persona", async () => {
    const { ctx } = contextoDePrueba({
      semilla: { ...semilla(), ticket: [ticketFila({})] },
      modulosActivos: ACTIVOS,
      permisos: ["tickets:tickets.ver", "tickets:tickets.ver_todos"],
    });
    const r = await executeCapability(ctx, "tickets.tickets.obtener", { id: TICKET_1 });
    expect(r).toMatchObject({ ok: true });
  });

  it("sin alcance, comentar y cambiar_estado dan el mismo NOT_FOUND que un id inexistente (sin enumeración)", async () => {
    const { ctx } = contextoDePrueba({
      semilla: { ...semilla(), ticket: [ticketFila({})] },
      modulosActivos: ACTIVOS,
      permisos: ["tickets:tickets.ver", "tickets:tickets.gestionar"],
    });
    const inexistente = "0192f3a0-0000-7000-8000-0000000000ff";
    const comentarAjeno = await executeCapability(ctx, "tickets.tickets.comentar", {
      id: TICKET_1,
      comentario: "¿Puedo ver esto?",
    });
    const comentarInexistente = await executeCapability(ctx, "tickets.tickets.comentar", {
      id: inexistente,
      comentario: "¿Puedo ver esto?",
    });
    expect(comentarAjeno).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(comentarInexistente).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });

    const estadoAjeno = await executeCapability(ctx, "tickets.tickets.cambiar_estado", {
      id: TICKET_1,
      estado: "en_curso",
    });
    const estadoInexistente = await executeCapability(ctx, "tickets.tickets.cambiar_estado", {
      id: inexistente,
      estado: "en_curso",
    });
    expect(estadoAjeno).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(estadoInexistente).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

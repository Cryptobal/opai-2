// El responsable de un ticket o de un tipo debe tener membresía ACTIVA en el tenant actual: ni de
// otra empresa ni suspendido. La base en memoria no aplica RLS, así que «otra empresa» se modela con
// una membresía de otro tenant y «inactiva» con otro estado. Los tests contra Postgres real de RLS
// viven en `packages/db/test`.
import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ACTIVOS, semilla, TIPO_ID } from "./fixtures";
import { capacidades } from "./index";

const AJENO = "0192f3a0-0000-7000-8000-0000000000a1";
const SUSPENDIDO = "0192f3a0-0000-7000-8000-0000000000a2";
const OTRO_TENANT = "0192f3a0-0000-7000-8000-0000000000f9";

function conMiembros() {
  const base = semilla();
  return {
    ...base,
    membership: [
      ...base.membership,
      { id: "0192f3a0-0000-7000-8000-0000000000e8", tenantId: OTRO_TENANT, userId: AJENO, rol: "supervisor", estado: "activa" },
      { id: "0192f3a0-0000-7000-8000-0000000000e9", tenantId: base.membership[0]!.tenantId, userId: SUSPENDIDO, rol: "supervisor", estado: "suspendida" },
    ],
  };
}

const ticket = (responsableId: string) => ({
  tipoId: TIPO_ID,
  titulo: "Fuga de agua",
  descripcion: "Hay una fuga cerca del panel.",
  responsableId,
});
const tipo = (usuarioId: string) => ({
  nombre: "Tipo nuevo",
  responsableDefectoTipo: "usuario" as const,
  responsableDefectoUsuarioId: usuarioId,
});

beforeAll(() => {
  registrarCapacidades(capacidades);
});

describe.each([
  ["usuario de otro tenant", AJENO],
  ["membresía inactiva", SUSPENDIDO],
])("responsable inválido (%s)", (_, userId) => {
  it("tickets.crear lo rechaza, también en dry_run, sin crear nada", async () => {
    const { ctx } = contextoDePrueba({ semilla: conMiembros(), modulosActivos: ACTIVOS });
    for (const dryRun of [false, true]) {
      const r = await executeCapability(ctx, "tickets.tickets.crear", ticket(userId), { dryRun });
      expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    }
    expect(await ctx.db.ticket.findMany({})).toHaveLength(0);
  });

  it("tickets.tipos.crear lo rechaza, también en dry_run, sin crear nada", async () => {
    const { ctx } = contextoDePrueba({ semilla: conMiembros(), modulosActivos: ACTIVOS });
    for (const dryRun of [false, true]) {
      const r = await executeCapability(ctx, "tickets.tipos.crear", tipo(userId), { dryRun });
      expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    }
    expect(await ctx.db.tipoTicket.findMany({})).toHaveLength(2);
  });

  it("el error no revela si el usuario existe en otra empresa", async () => {
    const { ctx } = contextoDePrueba({ semilla: conMiembros(), modulosActivos: ACTIVOS });
    const real = await executeCapability(ctx, "tickets.tickets.crear", ticket(userId));
    const inexistente = await executeCapability(
      ctx,
      "tickets.tickets.crear",
      ticket("0192f3a0-0000-7000-8000-0000000000ff"),
    );
    expect(real).toEqual(inexistente);
  });
});

describe("responsable válido", () => {
  it("un miembro activo se acepta y dry_run devuelve un id con forma de uuid", async () => {
    const { ctx } = contextoDePrueba({ semilla: conMiembros(), modulosActivos: ACTIVOS });
    const r = await executeCapability(ctx, "tickets.tickets.crear", ticket(semilla().membership[0]!.userId), {
      dryRun: true,
    });
    expect(r).toMatchObject({ ok: true, data: { id: expect.stringMatching(/^[0-9a-f-]{36}$/) } });
  });

  it("si el responsable por defecto del tipo ya no es miembro activo, crear falla claro", async () => {
    const base = conMiembros();
    base.membership[0]!.estado = "suspendida";
    const { ctx } = contextoDePrueba({ semilla: base, modulosActivos: ACTIVOS });
    const r = await executeCapability(ctx, "tickets.tickets.crear", {
      tipoId: TIPO_ID,
      titulo: "Fuga de agua",
      descripcion: "Hay una fuga cerca del panel.",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});

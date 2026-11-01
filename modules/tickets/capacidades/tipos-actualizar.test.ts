// tickets.tipos.actualizar: mismo helper de membresía activa que crear, dry_run sin efectos y
// desactivar en vez de borrar. La base en memoria no aplica RLS (eso vive en packages/db/test).
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

beforeAll(() => {
  registrarCapacidades(capacidades);
});

describe.each([
  ["usuario de otro tenant", AJENO],
  ["membresía inactiva", SUSPENDIDO],
])("tipos.actualizar con responsable inválido (%s)", (_, userId) => {
  it("lo rechaza, también en dry_run, y el tipo queda igual", async () => {
    const { ctx } = contextoDePrueba({ semilla: conMiembros(), modulosActivos: ACTIVOS });
    for (const dryRun of [false, true]) {
      const r = await executeCapability(
        ctx,
        "tickets.tipos.actualizar",
        { id: TIPO_ID, responsableDefectoTipo: "usuario", responsableDefectoUsuarioId: userId },
        { dryRun },
      );
      expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    }
    const t = await ctx.db.tipoTicket.findFirst({ where: { id: TIPO_ID } });
    expect(t?.responsableDefectoUsuarioId).toBe(semilla().membership[0]!.userId);
  });
});

describe("tipos.actualizar", () => {
  it("cambia campos y desactiva; dry_run no escribe", async () => {
    const { ctx } = contextoDePrueba({ semilla: conMiembros(), modulosActivos: ACTIVOS });
    const prev = await executeCapability(ctx, "tickets.tipos.actualizar", { id: TIPO_ID, slaHoras: 24 }, { dryRun: true });
    expect(prev).toMatchObject({ ok: true, data: { slaHoras: 24 } });
    expect((await ctx.db.tipoTicket.findFirst({ where: { id: TIPO_ID } }))?.slaHoras).toBeNull();
    const r = await executeCapability(ctx, "tickets.tipos.actualizar", { id: TIPO_ID, slaHoras: 24, activo: false });
    expect(r).toMatchObject({ ok: true, data: { slaHoras: 24, activo: false } });
  });

  it("exige rol aprobador al encender la aprobación y rechaza un tipo inexistente", async () => {
    const { ctx } = contextoDePrueba({ semilla: conMiembros(), modulosActivos: ACTIVOS });
    const sinRol = await executeCapability(ctx, "tickets.tipos.actualizar", { id: TIPO_ID, requiereAprobacion: true });
    expect(sinRol).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const noExiste = await executeCapability(ctx, "tickets.tipos.actualizar", {
      id: "0192f3a0-0000-7000-8000-0000000000ff",
      activo: false,
    });
    expect(noExiste).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

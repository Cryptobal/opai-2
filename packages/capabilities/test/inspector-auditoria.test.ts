import { beforeEach, describe, expect, it, vi } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

async function preparar() {
  const p = contextoDePrueba();
  await p.ctx.auditoria.registrar({
    tenantId: p.ctx.tenantId,
    actor: p.ctx.actor,
    capability: "core.estructuras.create",
    entityType: "estructura",
    entityId: "0192f3a0-0000-7000-8000-000000000001",
    payload: {
      input: {
        sueldoBase: 3_000_000,
        items: [{ nombre: "Bono", monto: 50_000, porcentaje: null }],
      },
    },
  });
  p.eventos.length = 0;
  return p;
}

describe.each(["core.audit.list", "core.actividad.list"])("%s: remuneraciones auditadas", (id) => {
  it("sin read_sensible no revela ni sueldo ni bonos", async () => {
    const { ctx, eventos } = await preparar();
    const sinSensible = { ...ctx, autorizar: (p: string) => p === "core:audit.read" };
    const r = await dato(sinSensible, id, {});
    expect(JSON.stringify(r)).not.toContain("3000000");
    expect(JSON.stringify(r)).not.toContain("50000");
    expect(JSON.stringify(r)).toContain("••••");
    expect(eventos).toHaveLength(0);
  });

  it("cada revelación deja referencia al evento leído, sin copiar montos", async () => {
    const { ctx, eventos } = await preparar();
    expect(JSON.stringify(await dato(ctx, id, {}))).toContain("3000000");
    expect(eventos).toEqual([
      expect.objectContaining({
        actor: ctx.actor,
        capability: "core.estructuras.read_sensible",
        entityType: "audit_event",
        payload: expect.objectContaining({ origen: id }),
      }),
    ]);
    expect(JSON.stringify(eventos)).not.toContain("3000000");
  });

  it("rechaza alcance limitado y falla cerrado si no puede auditar", async () => {
    const { ctx } = await preparar();
    expect(await codigo({ ...ctx, alcance: { instalaciones: [] } }, id, {})).toBe("FORBIDDEN");
    const fallo = {
      ...ctx,
      auditoria: { registrar: vi.fn().mockRejectedValue(new Error("Sin auditoría")) },
    };
    expect(await codigo(fallo, id, {})).toBe("INTERNAL");
  });
});

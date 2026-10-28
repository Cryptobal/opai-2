import { beforeEach, describe, expect, it, vi } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba } from "../src/testing";
import { M1, M2, semillaTenant } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

describe("portal de inicio personal", () => {
  it("no exige administrar usuarios: preview no escribe y la ejecución real solo cambia la propia", async () => {
    const { ctx, tabla, eventos } = contextoDePrueba({ rol: "viewer", semilla: semillaTenant() });
    const input = { portal: "erp" };
    expect(
      await executeCapability(ctx, "core.me.portal_inicio", input, { dryRun: true }),
    ).toMatchObject({ ok: true });
    expect(tabla("membership").find((m) => m["id"] === M1)?.["portalInicio"]).toBeUndefined();
    expect(
      await executeCapability(ctx, "core.me.portal_inicio", input, { idempotencyKey: "inicio-1" }),
    ).toMatchObject({
      ok: true,
      data: { portalInicio: "erp" },
    });
    expect(tabla("membership").find((m) => m["id"] === M1)?.["portalInicio"]).toBe("erp");
    expect(tabla("membership").find((m) => m["id"] === M2)?.["portalInicio"]).toBeUndefined();
    expect(eventos).toHaveLength(1);
    expect(
      await executeCapability(ctx, "core.me.portal_inicio", input, { idempotencyKey: "inicio-1" }),
    ).toMatchObject({ ok: true });
    expect(tabla("evento")).toHaveLength(1);
  });
  it("rechaza un portal ajeno, Plataforma y una membresía suspendida", async () => {
    const { ctx } = contextoDePrueba({ rol: "viewer", semilla: semillaTenant() });
    expect(
      await executeCapability(ctx, "core.me.portal_inicio", { portal: "supervisor" }),
    ).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(
      await executeCapability(ctx, "core.me.portal_inicio", { portal: "platform" }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    const base = semillaTenant();
    base.membership[0]!.estado = "suspendida";
    const suspendida = contextoDePrueba({ semilla: base });
    expect(
      await executeCapability(suspendida.ctx, "core.me.portal_inicio", { portal: null }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
  it("sin membresía propia no elige la de otro usuario", async () => {
    const semilla = semillaTenant();
    semilla.membership = semilla.membership.filter((m) => m.id === M2);
    const { ctx } = contextoDePrueba({ semilla });
    expect(await executeCapability(ctx, "core.me.portal_inicio", { portal: "erp" })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });
  it("al invitar valida y persiste la preferencia", async () => {
    const { ctx, tabla } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const input = {
      email: "inicio@example.test",
      rol: "viewer",
      portales: ["erp"],
      portalInicio: "supervisor",
    };
    expect(await executeCapability(ctx, "core.users.invite", input)).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE" },
    });
    expect(
      await executeCapability(ctx, "core.users.invite", { ...input, portalInicio: "erp" }),
    ).toMatchObject({ ok: true });
    expect(tabla("invitation")[0]?.["portalInicio"]).toBe("erp");
  });
  it("si el portal se revoca entre la lectura y la escritura falla sin evento", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semillaTenant() });
    const transaccion = ctx.transaccion;
    ctx.transaccion = (fn) =>
      transaccion(async (tx) => {
        const updateMany = tx.membership.updateMany.bind(tx.membership);
        const espia = vi.spyOn(tx.membership, "updateMany").mockImplementationOnce((args) => {
          tabla("membership").find((m) => m["id"] === M1)!["portales"] = ["supervisor"];
          return updateMany(args);
        });
        try {
          return await fn(tx);
        } finally {
          espia.mockRestore();
        }
      });
    expect(await executeCapability(ctx, "core.me.portal_inicio", { portal: "erp" })).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
    expect(tabla("membership").find((m) => m["id"] === M1)?.["portalInicio"]).toBeUndefined();
    expect(tabla("evento")).toHaveLength(0);
  });
});

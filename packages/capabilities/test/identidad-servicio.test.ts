import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";
import { M2, semillaTenant } from "./semilla";

beforeEach(reiniciar);
const input = {
  nombre: "Servicio de prueba",
  tipo: "servicio",
  scopes: ["core"],
  permisos: ["core:cuentas.read"],
  presupuestoMensualUsd: 5,
};

describe("identidad de servicio", () => {
  it("una key de owner no cambia el rol base ni promueve a owner (#60, review 5661003883)", async () => {
    const { ctx, tabla } = contextoDePrueba({
      semilla: semillaTenant("gerente"),
      rol: "owner",
      actor: { tipo: "agent", id: "key", viaUserId: "u" },
    });
    for (const rol of ["admin", "owner", "viewer"])
      expect(await codigo(ctx, "core.users.update", { membershipId: M2, rol })).toBe("FORBIDDEN");
    expect(tabla("membership").find((m) => m["id"] === M2)?.["rol"]).toBe("gerente");
  });
  it("crea con permisos explícitos y presupuesto; vista previa no escribe", async () => {
    const { ctx, tabla } = contextoDePrueba({ semilla: semillaTenant() });
    expect(
      await executeCapability(ctx, "core.apikeys.create", input, { dryRun: true }),
    ).toMatchObject({
      ok: true,
      data: { tipo: "servicio", permisos: input.permisos, secreto: null },
    });
    expect(tabla("apiKey")).toHaveLength(0);
    const r = await dato(ctx, "core.apikeys.create", input);
    expect(r).toMatchObject({ tipo: "servicio", permisos: input.permisos });
    expect(tabla("apiKey")[0]).toMatchObject({
      principalTipo: "servicio",
      heredaPermisos: false,
      permisos: input.permisos,
      presupuestoMensualMicro: 5_000_000n,
    });
  });
  it("nadie concede a su key permisos o alcance que no tiene", async () => {
    const { ctx } = contextoDePrueba({
      semilla: semillaTenant(),
      permisos: ["core:apikeys.manage", "core:agentes.manage"],
    });
    expect(await codigo(ctx, "core.apikeys.create", input)).toBe("FORBIDDEN");
    const limitado = contextoDePrueba({ semilla: semillaTenant(), alcance: { instalaciones: [] } });
    expect(await codigo(limitado.ctx, "core.apikeys.create", input)).toBe("FORBIDDEN");
  });
  it("servicio no hereda rol ni plataforma y soloPersonas sigue cerrado", async () => {
    const { ctx } = contextoDePrueba({
      rol: "owner",
      actor: { tipo: "agent", id: "key", viaUserId: "u" },
      claveApi: { servicio: true, permisos: ["core:cuentas.read", "core:apikeys.manage"] },
    });
    expect(ctx.autorizar("core:cuentas.read")).toBe(true);
    expect(ctx.autorizar("core:users.manage")).toBe(false);
    expect(ctx.autorizar("platform:tenants.manage")).toBe(false);
    expect(await codigo(ctx, "core.apikeys.create", input)).toBe("FORBIDDEN");
  });
  it("exige presupuesto y permisos explícitos también al actualizar", async () => {
    const { ctx } = contextoDePrueba({ semilla: semillaTenant() });
    expect(
      await codigo(ctx, "core.apikeys.create", { ...input, presupuestoMensualUsd: undefined }),
    ).toBe("UNPROCESSABLE");
    expect(await codigo(ctx, "core.apikeys.create", { ...input, permisos: undefined })).toBe(
      "UNPROCESSABLE",
    );
    expect((await executeCapability(ctx, "core.apikeys.create", { ...input, permisos: [] })).ok).toBe(false);
    const { id } = await dato<{ id: string }>(ctx, "core.apikeys.create", input);
    for (const presupuestoMensualUsd of [0, null])
      expect(await codigo(ctx, "core.apikeys.update", { id, presupuestoMensualUsd })).toBe(
        "UNPROCESSABLE",
      );
  });
});

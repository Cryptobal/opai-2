// CAR-54 (auditoría del Núcleo I-15): Plataforma restablece el segundo factor de un usuario de
// cualquier empresa cuando no queda un owner de esa empresa disponible.
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant, U2 } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };

function semilla() {
  const s = semillaTenant();
  return {
    ...s,
    user: s.user.map((u) =>
      u.id === owner.id
        ? { ...u, platformRole: "owner" }
        : u.id === U2
          ? { ...u, twoFactorEnabled: true }
          : u,
    ),
    twoFactor: [{ id: "tf-1", userId: U2, secret: "x", backupCodes: "[]", verified: true }],
  };
}

describe("platform.users.mfa_restablecer (CAR-54)", () => {
  it("un owner de plataforma lo restablece por correo y deja DOS hechos: plataforma (automático) y seguridad (explícito)", async () => {
    const { ctx, tabla } = contextoDePrueba({ usuario: owner, semilla: semilla() });
    const vista = await executeCapability(
      ctx,
      "platform.users.mfa_restablecer",
      { email: "beto@prueba.cl" },
      { dryRun: true },
    );
    expect(vista).toMatchObject({ ok: true, dryRun: true, data: { restablecido: true } });
    expect(tabla("twoFactor")).toHaveLength(1);

    const real = await executeCapability(ctx, "platform.users.mfa_restablecer", {
      email: "beto@prueba.cl",
    });
    expect(real).toMatchObject({ ok: true, data: { restablecido: true } });
    expect(tabla("twoFactor")).toHaveLength(0);
    expect(tabla("user").find((u) => u.id === U2)?.twoFactorEnabled).toBe(false);
    const propios = tabla("auditoriaGlobal").filter(
      (e) => e.capability === "platform.users.mfa_restablecer",
    );
    expect(propios).toHaveLength(2);
    expect(propios.find((e) => e.ambito === "plataforma")).toMatchObject({ actorId: owner.id });
    expect(propios.find((e) => e.ambito === "seguridad")).toMatchObject({
      actorId: owner.id,
      entityId: U2,
    });
  });

  it("quien no tiene rol de plataforma no puede", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semilla() });
    const r = await executeCapability(ctx, "platform.users.mfa_restablecer", {
      email: "beto@prueba.cl",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("nadie restablece su propio segundo factor aquí", async () => {
    const { ctx } = contextoDePrueba({ usuario: owner, semilla: semilla() });
    const r = await executeCapability(ctx, "platform.users.mfa_restablecer", {
      email: "ana@prueba.cl",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("correo inexistente: mismo error que uno sin MFA (sin oráculo de qué cuentas existen)", async () => {
    const { ctx } = contextoDePrueba({ usuario: owner, semilla: semilla() });
    const r = await executeCapability(ctx, "platform.users.mfa_restablecer", {
      email: "fantasma@prueba.cl",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("un agente de plataforma no puede, ni siquiera en vista previa (soloPersonas, ADR-034)", async () => {
    const { ctx } = contextoDePrueba({
      usuario: owner,
      actor: { tipo: "agent", id: "k1", viaUserId: owner.id },
      scopes: ["*"],
      claveApi: { permisos: null, servicio: false, plataforma: true },
      semilla: semilla(),
    });
    const r = await executeCapability(
      ctx,
      "platform.users.mfa_restablecer",
      { email: "beto@prueba.cl" },
      { dryRun: true },
    );
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

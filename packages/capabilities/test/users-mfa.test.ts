// CAR-54 (auditoría del Núcleo I-15): un owner restablece (apaga) el segundo factor de otro
// usuario de su empresa cuando perdió el teléfono y los códigos de respaldo.
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { M1, M2, semillaTenant, U2 } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

/** Semilla con Beto (M2) con el segundo factor activo. */
function semillaConMfa(rolBeto = "admin") {
  const s = semillaTenant(rolBeto);
  return {
    ...s,
    user: s.user.map((u) => (u.id === U2 ? { ...u, twoFactorEnabled: true } : u)),
    twoFactor: [{ id: "tf-1", userId: U2, secret: "x", backupCodes: "[]", verified: true }],
    session: [{ id: "ses-1", userId: U2, token: "t1", expiresAt: new Date(), mfaVerified: true }],
  };
}

describe("core.users.mfa_restablecer (CAR-54)", () => {
  it("un owner lo restablece: apaga two_factor, limpia mfaVerified de sus sesiones, audita y avisa por correo", async () => {
    const { ctx, tabla, eventos, correos } = contextoDePrueba({
      rol: "owner",
      semilla: semillaConMfa(),
    });
    const vista = await executeCapability(
      ctx,
      "core.users.mfa_restablecer",
      { membershipId: M2 },
      { dryRun: true },
    );
    expect(vista).toMatchObject({ ok: true, dryRun: true, data: { restablecido: true } });
    expect(tabla("twoFactor")).toHaveLength(1);

    const real = await executeCapability(ctx, "core.users.mfa_restablecer", { membershipId: M2 });
    expect(real).toMatchObject({ ok: true, data: { restablecido: true, email: "beto@prueba.cl" } });
    expect(tabla("twoFactor")).toHaveLength(0);
    expect(tabla("user").find((u) => u.id === U2)?.twoFactorEnabled).toBe(false);
    expect(tabla("session").find((s) => s.id === "ses-1")?.mfaVerified).toBe(false);
    // Auditoría de la empresa (automática, ADR-052) y hecho explícito en seguridad (CAR-42).
    expect(eventos.map((e) => e.capability)).toEqual(["core.users.mfa_restablecer"]);
    expect(tabla("auditoriaGlobal")).toMatchObject([
      {
        ambito: "seguridad",
        capability: "core.users.mfa_restablecer",
        actorId: USUARIO_DE_PRUEBA.id,
        entityId: U2,
      },
    ]);
    expect(correos).toHaveLength(1);
    expect(correos[0]).toMatchObject({ para: "beto@prueba.cl" });
  });

  it("admin no puede (solo owner, como el DPA); tampoco gerente ni viewer", async () => {
    for (const rol of ["admin", "gerente", "viewer"] as const) {
      const { ctx } = contextoDePrueba({ rol, semilla: semillaConMfa() });
      const r = await executeCapability(ctx, "core.users.mfa_restablecer", { membershipId: M2 });
      expect(r, rol).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    }
  });

  it("un owner no puede restablecer su propio segundo factor aquí", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaConMfa() });
    const r = await executeCapability(ctx, "core.users.mfa_restablecer", { membershipId: M1 });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("rechaza si el usuario no tiene el segundo factor activo", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaTenant() });
    const r = await executeCapability(ctx, "core.users.mfa_restablecer", { membershipId: M2 });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("un agente nunca lo ejecuta (soloPersonas, ADR-034)", async () => {
    const { ctx } = contextoDePrueba({
      rol: "owner",
      actor: { tipo: "agent", id: "k1", viaUserId: M1 },
      scopes: ["*"],
      semilla: semillaConMfa(),
    });
    const r = await executeCapability(ctx, "core.users.mfa_restablecer", { membershipId: M2 });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("no encuentra una membresía de otra empresa", async () => {
    const { ctx } = contextoDePrueba({ rol: "owner", semilla: semillaConMfa() });
    const r = await executeCapability(ctx, "core.users.mfa_restablecer", {
      membershipId: "0192f3a0-0000-7000-8000-00000000ffff",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

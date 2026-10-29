// CAR-43 (auditoría del Núcleo I-04): opai_app pierde el CRUD directo sobre sessions, accounts,
// verifications y two_factor (solo opai_auth, vía clienteAuth()); users pierde SELECT de columnas
// no listadas y DELETE; tenants pierde DELETE. Verifica el REVOKE real contra Postgres y que las
// operaciones con nombre (clienteAuth, ultimoAccesoDeUsuarios, restablecerMfaDeUsuario) sí funcionan.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("permisos de identidad para opai_app (CAR-43)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let userId = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    const u = await e.admin.user.create({
      data: { id: randomUUID(), name: "Permisos", email: `permisos-${sufijo}@prueba.cl` },
    });
    userId = u.id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("opai_app no tiene SELECT/INSERT/UPDATE/DELETE directo sobre sessions, accounts, verifications ni two_factor", async () => {
    await expect(e.appSinTenant.session.findMany()).rejects.toThrow(/permission denied/);
    await expect(e.appSinTenant.account.findMany()).rejects.toThrow(/permission denied/);
    await expect(e.appSinTenant.verification.findMany()).rejects.toThrow(/permission denied/);
    await expect(e.appSinTenant.twoFactor.findMany()).rejects.toThrow(/permission denied/);
    await expect(
      e.appSinTenant.session.create({
        data: { id: randomUUID(), token: "x", expiresAt: new Date(), userId },
      }),
    ).rejects.toThrow(/permission denied/);
  });

  it("opai_app no puede borrar un usuario ni una empresa (DELETE revocado)", async () => {
    await expect(e.appSinTenant.user.delete({ where: { id: userId } })).rejects.toThrow(
      /permission denied/,
    );
    const tenant = await e.admin.tenant.findFirstOrThrow();
    await expect(e.appSinTenant.tenant.delete({ where: { id: tenant.id } })).rejects.toThrow(
      /permission denied/,
    );
  });

  it("opai_app sigue leyendo users por columnas mínimas (sin DELETE)", async () => {
    const leido = await e.appSinTenant.user.findUnique({ where: { id: userId } });
    expect(leido?.email).toBe(`permisos-${sufijo}@prueba.cl`);
  });

  it("clienteAuth() (opai_auth) sí tiene CRUD sobre two_factor y sessions", async () => {
    const { clienteAuth } = await import("../src/globales");
    const tf = await clienteAuth().twoFactor.create({
      data: { id: randomUUID(), userId, secret: "s", backupCodes: "[]" },
    });
    expect(tf.userId).toBe(userId);
    const sesion = await clienteAuth().session.create({
      data: { id: randomUUID(), token: `t-${sufijo}`, expiresAt: new Date(), userId },
    });
    expect(sesion.userId).toBe(userId);
  });

  it("ultimoAccesoDeUsuarios lee solo userId/updatedAt vía opai_auth (CAR-43)", async () => {
    const { ultimoAccesoDeUsuarios } = await import("../src/globales");
    const ultimo = await ultimoAccesoDeUsuarios([userId]);
    expect(ultimo.has(userId)).toBe(true);
  });

  it("restablecerMfaDeUsuario apaga el segundo factor y limpia mfaVerified atómicamente", async () => {
    const { restablecerMfaDeUsuario } = await import("../src/globales");
    const r = await restablecerMfaDeUsuario(userId);
    expect(r).toBe(true);
    const sinMfa = await e.admin.twoFactor.findUnique({ where: { userId } });
    expect(sinMfa).toBeNull();
    const usuario = await e.admin.user.findUniqueOrThrow({ where: { id: userId } });
    expect(usuario.twoFactorEnabled).toBe(false);
    // Nada que restablecer la segunda vez.
    expect(await restablecerMfaDeUsuario(userId)).toBe(false);
  });
});

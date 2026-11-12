// CAR-286: una cuenta protegida solo con passkey que entra con otro método (Google o contraseña)
// queda con la sesión pendiente: no puede agregar otra passkey ni enrolar TOTP para saltarse el
// segundo factor. Los endpoints genéricos de listar/renombrar/borrar del plugin están apagados.
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Auth } from "../src/auth";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { prepararMfaHttp } from "./mfa-endpoint-fixture";

describe.skipIf(!urlPropietario)("passkey: segundo factor pendiente (CAR-286)", () => {
  let e: Entorno;
  let auth: Auth;
  let userId: string;
  let cookie = "";
  const email = `pk-http-${randomUUID()}@prueba.opai.cl`;

  const pedir = (ruta: string, metodo = "GET", cuerpo?: unknown) =>
    auth.handler(
      new Request(`http://localhost:3000/api/auth${ruta}`, {
        method: metodo,
        headers: {
          cookie,
          origin: "http://localhost:3000",
          ...(cuerpo ? { "content-type": "application/json" } : {}),
        },
        ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
      }),
    );

  beforeAll(async () => {
    e = await prepararEntorno();
    ({ auth, userId } = await prepararMfaHttp(e, email, randomUUID()));
    // Solo passkey: sin TOTP.
    await e.admin.twoFactor.deleteMany({ where: { userId } });
    await e.admin.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });
    await e.admin.passkey.create({
      data: {
        userId,
        publicKey: "cHVibGljYQ",
        credentialID: `cred-${randomUUID()}`,
        counter: 0,
        deviceType: "multiDevice",
        backedUp: true,
      },
    });
    const r = await auth.api.signInSocial({
      body: { provider: "google", idToken: { token: "token-falso" } },
      returnHeaders: true,
    });
    cookie = r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
  }, 120_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    if (e) {
      await e.admin.user.deleteMany({ where: { email } });
      await e.cerrar();
    }
  });

  it("la marca de la cuenta y la sesión quedan pendientes", async () => {
    const u = await e.admin.user.findUniqueOrThrow({ where: { id: userId } });
    expect(u.passkeyEnabled).toBe(true);
    const s = await e.admin.session.findFirstOrThrow({ where: { userId } });
    expect(s.mfaVerified).toBe(false);
  });

  it("con la sesión pendiente no agrega passkeys ni enrola TOTP", async () => {
    expect((await pedir("/passkey/generate-register-options")).status).toBe(403);
    expect((await pedir("/two-factor/enable", "POST", { password: "x" })).status).toBe(403);
  });

  it("con la sesión pendiente no cambia la contraseña ni ve o cierra otras sesiones", async () => {
    const pw = { currentPassword: "x", newPassword: "otra-clave-123" };
    expect((await pedir("/change-password", "POST", pw)).status).toBe(403);
    expect((await pedir("/list-sessions")).status).toBe(403);
    expect((await pedir("/revoke-other-sessions", "POST", {})).status).toBe(403);
  });

  it("los endpoints genéricos de gestión del plugin están apagados", async () => {
    for (const ruta of ["/passkey/list-user-passkeys", "/passkey/delete-passkey"])
      expect((await pedir(ruta, ruta.endsWith("delete-passkey") ? "POST" : "GET")).status).toBe(
        404,
      );
  });

  it("con el segundo factor completo sí puede preparar una passkey nueva", async () => {
    await e.admin.session.updateMany({ where: { userId }, data: { mfaVerified: true } });
    const r = await pedir("/passkey/generate-register-options");
    expect(r.status).toBe(200);
    const op = (await r.json()) as { authenticatorSelection?: { userVerification?: string } };
    expect(op.authenticatorSelection?.userVerification).toBe("required");
  });
});

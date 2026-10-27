import { randomUUID } from "node:crypto";

import { createOTP } from "@better-auth/utils/otp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Auth } from "../src/auth";
import type * as Mfa from "../src/mfa";
import { MFA_LIMITE_INTENTOS } from "../src/opciones";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { prepararMfaHttp } from "./mfa-endpoint-fixture";

const estado = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: estado.cookie }) }));

describe.skipIf(!urlPropietario)("MFA: endpoints directos y confirmación (#65, 5662691274)", () => {
  let e: Entorno;
  let auth: Auth;
  let mfa: typeof Mfa;
  let userId: string;
  const email = `mfa-http-${randomUUID()}@prueba.opai.cl`;
  const secret = randomUUID();
  const codigo = () => createOTP(secret, { digits: 6, period: 30 }).totp();

  beforeAll(async () => {
    e = await prepararEntorno();
    ({ auth, userId } = await prepararMfaHttp(e, email, secret));
    mfa = await import("../src/mfa");
  }, 120_000);

  beforeEach(async () => {
    await e.admin.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    await e.admin.twoFactor.update({
      where: { userId },
      data: { verified: true, failedVerificationCount: 0, lockedUntil: null },
    });
    const r = await auth.api.signInSocial({
      body: { provider: "google", idToken: { token: "token-falso" } },
      returnHeaders: true,
    });
    estado.cookie = r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    if (e) {
      await e.admin.user.deleteMany({ where: { email } });
      await e.cerrar();
    }
  });

  async function post(ruta: string, code: string) {
    const base = (await auth.$context).baseURL;
    return auth.handler(
      new Request(`${base}/two-factor/${ruta}`, {
        method: "POST",
        headers: {
          cookie: estado.cookie,
          "content-type": "application/json",
          origin: new URL(base).origin,
        },
        body: JSON.stringify({ code }),
      }),
    );
  }

  it.each(["verify-totp", "verify-backup-code"])(
    "POST directo %s no elude el bloqueo",
    async (ruta) => {
      const malo = (await codigo()) === "000000" ? "111111" : "000000";
      for (let i = 0; i < MFA_LIMITE_INTENTOS; i++)
        expect((await post(ruta, malo)).status).toBe(401);
      const r = await post(ruta, ruta === "verify-totp" ? await codigo() : "respaldo-http");
      expect(r.status).toBe(429);
      expect(await r.json()).toMatchObject({ code: "ACCOUNT_TEMPORARILY_LOCKED" });
      const sesiones = await e.admin.session.findMany({ where: { userId } });
      expect(sesiones.every((s) => !s.mfaVerified)).toBe(true);
    },
  );

  it("20 POST concurrentes mezclando factores solo admiten cinco verificaciones", async () => {
    const malo = (await codigo()) === "000000" ? "111111" : "000000";
    const resultados = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        post(i % 2 ? "verify-totp" : "verify-backup-code", malo),
      ),
    );
    expect(resultados.filter((r) => r.status === 401)).toHaveLength(MFA_LIMITE_INTENTOS);
    expect(resultados.filter((r) => r.status === 429)).toHaveLength(20 - MFA_LIMITE_INTENTOS);
    expect(
      (await e.admin.twoFactor.findUnique({ where: { userId } }))?.failedVerificationCount,
    ).toBe(MFA_LIMITE_INTENTOS);
  });

  it("confirmar rechaza MFA activo y estados de enrolamiento inconsistentes", async () => {
    expect(await mfa.confirmarSegundoFactor(await codigo())).toMatchObject({ ok: false });
    await e.admin.twoFactor.update({ where: { userId }, data: { verified: false } });
    expect(await mfa.confirmarSegundoFactor(await codigo())).toMatchObject({ ok: false });
    await e.admin.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });
    await e.admin.twoFactor.update({ where: { userId }, data: { verified: true } });
    expect(await mfa.confirmarSegundoFactor(await codigo())).toMatchObject({ ok: false });
    expect(
      (await e.admin.session.findMany({ where: { userId } })).every((s) => !s.mfaVerified),
    ).toBe(true);
  });

  it("confirmar enrolamiento pendiente comparte el tope y no activa tras agotarlo", async () => {
    await e.admin.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });
    await e.admin.twoFactor.update({ where: { userId }, data: { verified: false } });
    const malo = (await codigo()) === "000000" ? "111111" : "000000";
    for (let i = 0; i < MFA_LIMITE_INTENTOS; i++)
      expect(await mfa.confirmarSegundoFactor(malo)).toMatchObject({ ok: false });
    expect(await mfa.confirmarSegundoFactor(await codigo())).toMatchObject({
      ok: false,
      fallo: "bloqueada",
    });
    expect((await e.admin.user.findUnique({ where: { id: userId } }))?.twoFactorEnabled).toBe(
      false,
    );
  });

  it("confirmar sin fila de enrolamiento no verifica la sesión", async () => {
    const fila = await e.admin.twoFactor.delete({ where: { userId } });
    try {
      await e.admin.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });
      expect(await mfa.confirmarSegundoFactor(await codigo())).toMatchObject({ ok: false });
    } finally {
      await e.admin.twoFactor.create({ data: fila });
    }
  });

  it("confirmar un enrolamiento pendiente válido activa MFA y verifica solo su sesión", async () => {
    await e.admin.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });
    await e.admin.twoFactor.update({ where: { userId }, data: { verified: false } });
    expect(await mfa.confirmarSegundoFactor(await codigo())).toEqual({ ok: true });
    expect((await e.admin.user.findUnique({ where: { id: userId } }))?.twoFactorEnabled).toBe(true);
    expect(await e.admin.session.findMany({ where: { userId, mfaVerified: true } })).toHaveLength(
      1,
    );
  });
});

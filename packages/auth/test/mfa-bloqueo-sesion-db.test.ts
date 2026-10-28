// NÚCLEO-F: bloqueo por cuenta del segundo factor CUANDO YA HAY SESIÓN (Google u otro proveedor
// social con MFA pendiente, #68). En better-auth 1.7.12 el `accountLockout` del plugin `twoFactor`
// solo corre en el desafío de login sin sesión; con sesión, `verifyTOTP`/`verifyBackupCode` no
// cuentan fallos ni bloquean. El before hook del endpoint reserva atómicamente el intento también
// cuando estas acciones lo invocan (Revisor, PR #65, reviews 5662337649 y 5662691274).
import { randomUUID } from "node:crypto";

import { createOTP } from "@better-auth/utils/otp";
import { symmetricEncrypt } from "better-auth/crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Auth } from "../src/auth";
import type * as MfaMod from "../src/mfa";
import { MFA_LIMITE_INTENTOS } from "../src/opciones";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

const estado = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(estado.cookie ? { cookie: estado.cookie } : {}),
}));

describe.skipIf(!urlPropietario)(
  "Segundo factor con sesión: bloqueo por cuenta (#65, review 5662337649)",
  () => {
    let e: Entorno;
    let auth: Auth;
    let verificarSegundoFactor: typeof MfaMod.verificarSegundoFactor;
    let verificarCodigoRespaldo: typeof MfaMod.verificarCodigoRespaldo;
    const email = `mfa-sesion-${randomUUID()}@prueba.opai.cl`;
    const secret = randomUUID();
    let userId: string;

    beforeAll(async () => {
      e = await prepararEntorno();
      process.env["BETTER_AUTH_SECRET"] ??= randomUUID() + randomUUID();
      process.env["BETTER_AUTH_URL"] ??= "http://localhost:3000";
      process.env["GOOGLE_CLIENT_ID"] = "proveedor-falso-de-test";
      process.env["GOOGLE_CLIENT_SECRET"] = "proveedor-falso-de-test";
      ({ auth } = await import("../src/auth"));
      ({ verificarSegundoFactor, verificarCodigoRespaldo } = await import("../src/mfa"));
      const ctx = await auth.$context;
      const provider = ctx.socialProviders.find((p) => p.id === "google");
      if (!provider) throw new Error("Falta proveedor Google de prueba");
      provider.options = { ...provider.options, verifyIdToken: async () => true };
      vi.spyOn(provider, "getUserInfo").mockResolvedValue({
        user: { name: "Prueba", email, emailVerified: true },
        data: { sub: "google-prueba-bloqueo" },
      });
      const u = await e.admin.user.create({
        data: { name: "Prueba", email, emailVerified: true, twoFactorEnabled: true },
      });
      userId = u.id;
      await e.admin.account.create({
        data: { userId, providerId: "google", accountId: "google-prueba-bloqueo" },
      });
      await e.admin.twoFactor.create({
        data: {
          userId,
          verified: true,
          secret: await symmetricEncrypt({ key: ctx.secretConfig, data: secret }),
          backupCodes: await symmetricEncrypt({
            key: ctx.secretConfig,
            data: JSON.stringify(["respaldo-bloqueo"]),
          }),
        },
      });
    }, 120_000);

    afterAll(async () => {
      vi.restoreAllMocks();
      if (e) {
        await e.admin.user.deleteMany({ where: { email } });
        await e.cerrar();
      }
    });

    beforeEach(async () => {
      await e.admin.twoFactor.updateMany({
        where: { userId },
        data: { failedVerificationCount: 0, lockedUntil: null },
      });
    });

    /** Sesión social nueva (MFA pendiente): fija la cookie que lee el `next/headers` mockeado. */
    async function conSesionNueva(): Promise<void> {
      const r = await auth.api.signInSocial({
        body: { provider: "google", idToken: { token: "token-falso" } },
        returnHeaders: true,
      });
      estado.cookie = r.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
    }

    const codigoValido = () => createOTP(secret, { digits: 6, period: 30 }).totp();
    async function codigoMalo(): Promise<string> {
      const valido = await codigoValido();
      return valido === "000000" ? "111111" : "000000";
    }

    it("tras 5 fallos de TOTP con sesión, el sexto se rechaza aunque el código sea correcto", async () => {
      await conSesionNueva();
      const malo = await codigoMalo();
      for (let i = 0; i < MFA_LIMITE_INTENTOS; i++) {
        expect(await verificarSegundoFactor(malo)).toMatchObject({
          ok: false,
          fallo: "credenciales",
        });
      }
      expect(await verificarSegundoFactor(await codigoValido())).toMatchObject({
        ok: false,
        fallo: "bloqueada",
      });
    });

    it("el mismo tope aplica a los códigos de respaldo, con sesión", async () => {
      await conSesionNueva();
      for (let i = 0; i < MFA_LIMITE_INTENTOS; i++) {
        expect(await verificarCodigoRespaldo("no-es-un-codigo")).toMatchObject({
          ok: false,
          fallo: "credenciales",
        });
      }
      expect(await verificarCodigoRespaldo("respaldo-bloqueo")).toMatchObject({
        ok: false,
        fallo: "bloqueada",
      });
    });

    it("pasada la ventana, un código correcto vuelve a entrar y limpia el contador", async () => {
      await conSesionNueva();
      const malo = await codigoMalo();
      for (let i = 0; i < MFA_LIMITE_INTENTOS; i++) await verificarSegundoFactor(malo);
      // Simula que la ventana de bloqueo ya venció, en vez de esperar los minutos reales.
      await e.admin.twoFactor.updateMany({
        where: { userId },
        data: { lockedUntil: new Date(Date.now() - 1000) },
      });
      expect(await verificarSegundoFactor(await codigoValido())).toMatchObject({ ok: true });
      const fila = await e.admin.twoFactor.findUnique({ where: { userId } });
      expect(fila?.failedVerificationCount).toBe(0);
      expect(fila?.lockedUntil).toBeNull();
    });
  },
);

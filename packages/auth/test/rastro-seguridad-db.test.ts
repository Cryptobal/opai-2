// CAR-42: el rastro de seguridad con Better Auth real y Postgres. `auth.api.*` pasa por los hooks y
// por `clienteAuth()` con el rol `opai_auth`, así que esto también prueba el camino de CAR-43.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Auth } from "../src/auth";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

const PASSWORD = `Prueba-${randomUUID()}`;
const IP = "203.0.113.77";

describe.skipIf(!urlPropietario)("rastro de seguridad con Better Auth real (CAR-42)", () => {
  let e: Entorno;
  let auth: Auth;
  let ipHmac: (ip: string | null) => string | null;
  let hashCorreo: (correo: string) => string;
  const email = `rastro-${randomUUID().slice(0, 8)}@prueba.opai.cl`;
  let userId = "";

  const h = () => new Headers({ "x-forwarded-for": IP, "user-agent": "Prueba/1.0" });
  const eventos = () =>
    e.admin.auditoriaGlobal.findMany({
      where: { ambito: "seguridad", entityId: userId },
      orderBy: { seq: "asc" },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    process.env["BETTER_AUTH_SECRET"] ??= randomUUID() + randomUUID();
    process.env["BETTER_AUTH_URL"] ??= "http://localhost:3000";
    ({ auth } = await import("../src/auth"));
    ({ ipHmac } = await import("../src/rastro-seguridad"));
    ({ hashCorreo } = await import("../src/bloqueo-login"));
    const ctx = await auth.$context;
    userId = (await e.admin.user.create({ data: { name: "Rastro", email } })).id;
    await e.admin.account.create({
      data: {
        accountId: userId,
        providerId: "credential",
        userId,
        password: await ctx.password.hash(PASSWORD),
      },
    });
  }, 120_000);

  afterAll(async () => {
    if (!e) return;
    await e.admin.loginIntento.deleteMany({ where: { correoHash: hashCorreo(email) } });
    await e.admin.user.deleteMany({ where: { email } });
    await e.cerrar();
  });

  it("login fallido y correcto quedan con el usuario, el resultado y el HMAC de la IP", async () => {
    await expect(
      auth.api.signInEmail({ body: { email, password: "no-es-la-clave-1" }, headers: h() }),
    ).rejects.toThrow();
    const r = await auth.api.signInEmail({ body: { email, password: PASSWORD }, headers: h() });
    expect(r.token).toBeTruthy();
    const [fallo, ok] = await eventos();
    expect(fallo).toMatchObject({
      capability: "seguridad.login",
      actorId: userId,
      payload: { resultado: "fallido", metodo: "password" },
      ipCifrada: ipHmac(IP),
      userAgent: "Prueba/1.0",
    });
    expect(ok).toMatchObject({ capability: "seguridad.login", payload: { resultado: "ok" } });
    // Nunca la IP ni el correo en claro.
    const texto = JSON.stringify(await eventos());
    expect(texto).not.toContain(IP);
    expect(texto).not.toContain(email);
  });

  it("cambiar la contraseña y cerrar sesión también dejan su hecho", async () => {
    const r = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: h(),
      returnHeaders: true,
    });
    const cookie = r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const conSesion = () => new Headers({ cookie, "x-forwarded-for": IP });
    await expect(
      auth.api.changePassword({
        body: { currentPassword: "mala-clave-123", newPassword: `Otra-${randomUUID()}` },
        headers: conSesion(),
      }),
    ).rejects.toThrow();
    await auth.api.signOut({ headers: conSesion() });
    const tipos = (await eventos()).map((x) => [
      x.capability,
      Reflect.get(Object(x.payload), "resultado"),
    ]);
    expect(tipos).toContainEqual(["seguridad.password.cambio", "fallido"]);
    expect(tipos).toContainEqual(["seguridad.logout", "ok"]);
  });
});

// CAR-516 · Ingreso con Google desde la app nativa: el código de canje es de un solo uso, exige el
// verificador PKCE y abre una sesión nueva sin heredar el segundo factor.
import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Auth } from "../src/auth";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

const verificador = "v".repeat(43);
const reto = createHash("sha256").update(verificador).digest("base64url");

describe.skipIf(!urlPropietario)("canje de la app nativa (CAR-516)", () => {
  let e: Entorno;
  let auth: Auth;
  const email = `app-canje-${randomUUID()}@prueba.opai.cl`;
  let userId = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    process.env["BETTER_AUTH_SECRET"] ??= randomUUID() + randomUUID();
    process.env["BETTER_AUTH_URL"] ??= "http://localhost:3000";
    process.env["GOOGLE_CLIENT_ID"] = "proveedor-falso-de-test";
    process.env["GOOGLE_CLIENT_SECRET"] = "proveedor-falso-de-test";
    ({ auth } = await import("../src/auth"));
    const provider = (await auth.$context).socialProviders.find((p) => p.id === "google")!;
    provider.options = { ...provider.options, verifyIdToken: async () => true };
    vi.spyOn(provider, "getUserInfo").mockResolvedValue({
      user: { name: "Prueba", email, emailVerified: true },
      data: { sub: email },
    });
    userId = (await e.admin.user.create({ data: { name: "Prueba", email, emailVerified: true } }))
      .id;
    await e.admin.account.create({ data: { userId, providerId: "google", accountId: email } });
  }, 120_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    if (!e) return;
    await e.admin.user.deleteMany({ where: { email } });
    await e.cerrar();
  });

  /** Sesión del navegador del sistema tras entrar con Google. */
  async function navegador(): Promise<Headers> {
    const r = await auth.api.signInSocial({
      body: { provider: "google", idToken: { token: "token-falso" } },
      returnHeaders: true,
    });
    return new Headers({
      cookie: r.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; "),
    });
  }

  async function canjear(codigo: string, v = verificador) {
    return auth.api.canjearCodigoApp({
      body: { codigo, verificador: v },
      headers: new Headers(),
      returnHeaders: true,
    });
  }

  it("sin sesión no emite código", async () => {
    await expect(
      auth.api.emitirCodigoApp({ body: { reto }, headers: new Headers() }),
    ).rejects.toThrow();
  });

  it("con el verificador correcto abre una sesión nueva, una sola vez", async () => {
    const { codigo } = await auth.api.emitirCodigoApp({
      body: { reto },
      headers: await navegador(),
    });
    const r = await canjear(codigo);
    const cookie = r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const sesion = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(sesion?.user.id).toBe(userId);
    // Repetir el mismo código ya no sirve.
    await expect(canjear(codigo)).rejects.toThrow();
  });

  it("un verificador ajeno no abre sesión y el código queda gastado", async () => {
    const { codigo } = await auth.api.emitirCodigoApp({
      body: { reto },
      headers: await navegador(),
    });
    await expect(canjear(codigo, "x".repeat(43))).rejects.toThrow();
    await expect(canjear(codigo)).rejects.toThrow();
  });

  it("la sesión de la app no hereda el segundo factor verificado", async () => {
    const headers = await navegador();
    const navegadorSesion = await auth.api.getSession({ headers });
    await e.admin.session.update({
      where: { id: navegadorSesion!.session.id },
      data: { mfaVerified: true },
    });
    const { codigo } = await auth.api.emitirCodigoApp({ body: { reto }, headers });
    await canjear(codigo);
    const nuevas = await e.admin.session.findMany({
      where: { userId, NOT: { id: navegadorSesion!.session.id } },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    expect(nuevas[0]?.mfaVerified).toBe(false);
  });
});

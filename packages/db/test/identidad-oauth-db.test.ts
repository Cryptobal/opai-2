// CAR-247 PR 2: apps conectadas por OAuth. Se listan solo las de la persona en la empresa actual y
// desconectar corta sus accesos (tokens revocados, consentimiento borrado) solo en esa empresa, en la
// transacción del llamador y con rastro en la cadena `seguridad`.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type * as Oauth from "../src/identidad-oauth";
import type * as Transaccion from "../src/transaccion";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("apps conectadas por OAuth (CAR-247)", () => {
  let e: Entorno;
  let m: typeof Oauth;
  let tx: typeof Transaccion;
  const sufijo = randomUUID().slice(0, 8);
  const app = `app-${sufijo}`;
  let tenantId = "";
  let otraEmpresa = "";
  let userId = "";
  let otro = "";
  const o = () => ({ tenantId, via: "persona" as const });
  const ahora = () => new Date();
  const token = (uid: string, ref: string, tipo: "acceso" | "refresh") => {
    const base = {
      token: `${tipo}-${randomUUID()}`,
      clientId: app,
      userId: uid,
      referenceId: ref,
      resources: [],
      requestedUserInfoClaims: [],
      scopes: ["mcp:leer"],
      expiresAt: new Date(Date.now() + 3_600_000),
      createdAt: ahora(),
    };
    return tipo === "acceso"
      ? e.admin.oauthAccessToken.create({ data: base })
      : e.admin.oauthRefreshToken.create({ data: base });
  };
  const consentir = (uid: string, ref: string) =>
    e.admin.oauthConsent.create({
      data: {
        clientId: app,
        userId: uid,
        referenceId: ref,
        resources: [],
        requestedUserInfoClaims: [],
        scopes: ["mcp:leer", "offline_access"],
        createdAt: ahora(),
        updatedAt: ahora(),
      },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    m = await import("../src/identidad-oauth");
    tx = await import("../src/transaccion");
    const empresa = async (s: string) =>
      (
        await e.admin.tenant.create({
          data: { slug: `oa-${s}-${sufijo}`, nombre: "Oa", vertical: "seguridad" },
        })
      ).id;
    tenantId = await empresa("a");
    otraEmpresa = await empresa("b");
    const crear = async (n: string) =>
      (await e.admin.user.create({ data: { name: n, email: `${n}-${sufijo}@test.opai.cl` } })).id;
    userId = await crear("oa");
    otro = await crear("oa-otro");
    await e.admin.oauthClient.create({
      data: {
        clientId: app,
        name: "App de prueba",
        scopes: ["mcp:leer"],
        contacts: [],
        redirectUris: ["https://app.invalid/cb"],
        postLogoutRedirectUris: [],
        grantTypes: ["authorization_code"],
        responseTypes: ["code"],
      },
    });
  });

  afterAll(async () => {
    if (!e) return;
    await e.admin.oauthClient.deleteMany({ where: { clientId: app } });
    await e.admin.user.deleteMany({ where: { id: { in: [userId, otro] } } });
    await e.admin.tenant.deleteMany({ where: { id: { in: [tenantId, otraEmpresa] } } });
    await e.cerrar();
  });

  it("lista solo las apps de la persona en esta empresa, sin tokens", async () => {
    await consentir(userId, tenantId);
    await consentir(userId, otraEmpresa);
    await consentir(otro, tenantId);
    await token(userId, tenantId, "acceso");
    const apps = await m.appsConectadas(userId, tenantId);
    expect(apps).toHaveLength(1);
    expect(apps[0]).toMatchObject({
      clientId: app,
      nombre: "App de prueba",
      alcances: ["mcp:leer", "offline_access"],
    });
    expect(apps[0]?.ultimoUso).toBeInstanceOf(Date);
    expect(JSON.stringify(apps)).not.toContain("acceso-");
  });

  it("desconectar revoca y borra solo lo de esta persona en esta empresa, con rastro", async () => {
    const mio = await token(userId, tenantId, "refresh");
    const otraEmp = await token(userId, otraEmpresa, "acceso");
    const renovOtra = await token(userId, otraEmpresa, "refresh");
    const ajeno = await token(otro, tenantId, "acceso");
    const r = await tx.enTransaccion(tenantId, async (t) => [
      await m.desconectarApp(t, userId, tenantId, app, o()),
      await m.desconectarApp(t, userId, tenantId, app, o()),
    ]);
    expect(r).toEqual([true, false]);
    expect(await e.admin.oauthRefreshToken.count({ where: { id: mio.id } })).toBe(0);
    const otra = await e.admin.oauthRefreshToken.findUniqueOrThrow({ where: { id: renovOtra.id } });
    expect(otra.revoked).toBeNull();
    const intactos = await e.admin.oauthAccessToken.findMany({
      where: { id: { in: [otraEmp.id, ajeno.id] } },
    });
    expect(intactos.every((x) => x.revoked === null)).toBe(true);
    const vigentesMios = await e.admin.oauthAccessToken.count({
      where: { userId, referenceId: tenantId, revoked: null },
    });
    expect(vigentesMios).toBe(0);
    expect(await m.appsConectadas(userId, tenantId)).toEqual([]);
    expect(await m.appsConectadas(userId, otraEmpresa)).toHaveLength(1);
    const rastro = await e.admin.$queryRaw<{ capability: string }[]>`
      SELECT capability FROM core.auditoria_global
       WHERE ambito = 'seguridad' AND entity_id = ${userId} ORDER BY seq`;
    expect(rastro.map((x) => x.capability)).toEqual(["seguridad.oauth.desconexion"]);
  });
});

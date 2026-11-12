// CAR-247: el MCP acepta un token OAuth solo si está vigente, es del MCP, su app sigue activa y
// trae persona y empresa. Contra Postgres real y con el rol `opai_auth` de `clienteAuth()`.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { hashTokenOAuth } from "../src/oauth-reglas";
import type { tokenOAuthVigente as TokenVigente } from "../src/oauth-token";

const RECURSO = "http://localhost:3000/api/mcp";

describe.skipIf(!urlPropietario)("token OAuth del MCP contra la base (CAR-247)", () => {
  let e: Entorno;
  let tokenOAuthVigente: typeof TokenVigente;
  let userId: string;
  const clientId = `prueba-${randomUUID()}`;
  const tenantId = randomUUID();

  async function token(datos: {
    vence?: number;
    revocado?: boolean;
    recurso?: string;
    sinEmpresa?: boolean;
    cliente?: string;
  }): Promise<string> {
    const valor = randomBytes(24).toString("base64url");
    await e.admin.oauthAccessToken.create({
      data: {
        token: hashTokenOAuth(valor),
        clientId: datos.cliente ?? clientId,
        userId,
        referenceId: datos.sinEmpresa ? null : tenantId,
        resources: [datos.recurso ?? RECURSO],
        requestedUserInfoClaims: [],
        scopes: ["mcp:leer"],
        expiresAt: new Date(Date.now() + (datos.vence ?? 3_600_000)),
        createdAt: new Date(),
        revoked: datos.revocado ? new Date() : null,
      },
    });
    return valor;
  }

  const cliente = (id: string, disabled: boolean) =>
    e.admin.oauthClient.create({
      data: {
        clientId: id,
        name: "App de prueba",
        disabled,
        scopes: ["mcp:leer"],
        contacts: [],
        redirectUris: ["https://app.invalid/cb"],
        postLogoutRedirectUris: [],
        grantTypes: ["authorization_code"],
        responseTypes: ["code"],
      },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    process.env["BETTER_AUTH_URL"] ??= "http://localhost:3000";
    ({ tokenOAuthVigente } = await import("../src/oauth-token"));
    const u = await e.admin.user.create({
      data: { name: "Prueba OAuth", email: `oauth-${randomUUID().slice(0, 8)}@prueba.opai.cl` },
    });
    userId = u.id;
    await cliente(clientId, false);
    await cliente(`${clientId}-off`, true);
  }, 120_000);

  afterAll(async () => {
    await e.admin.oauthClient.deleteMany({ where: { clientId: { startsWith: clientId } } });
    await e.admin.user.delete({ where: { id: userId } });
    await e.cerrar();
  });

  it("un token vigente del MCP devuelve persona, empresa, app y alcances", async () => {
    const r = await tokenOAuthVigente(await token({}), RECURSO);
    expect(r).toEqual({ userId, tenantId, clientId, app: "App de prueba", alcances: ["mcp:leer"] });
  });

  it("rechaza vencido, revocado, de otro recurso, sin empresa, de app desactivada o inventado", async () => {
    const malos = [
      await token({ vence: -1000 }),
      await token({ revocado: true }),
      await token({ recurso: "https://otro.invalid/api" }),
      await token({ sinEmpresa: true }),
      await token({ cliente: `${clientId}-off` }),
      randomBytes(24).toString("base64url"),
    ];
    for (const t of malos) expect(await tokenOAuthVigente(t, RECURSO)).toBeNull();
  });
});

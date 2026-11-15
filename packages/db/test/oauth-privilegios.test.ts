// OAuth del MCP (CAR-247): las tablas del proveedor son de identidad. opai_app no las lee ni las
// escribe (un filtro olvidado no expone tokens ni clientes); solo el rol opai_auth de clienteAuth().
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

const DENEGADO = /permission denied|denegado/i;
const TABLAS = [
  "oauth_clients",
  "oauth_resources",
  "oauth_client_resources",
  "oauth_refresh_tokens",
  "oauth_access_tokens",
  "oauth_consents",
  "oauth_client_assertions",
];

describe.skipIf(!urlPropietario)("OAuth del MCP: privilegios (CAR-247)", () => {
  let e: Entorno;
  beforeAll(async () => {
    e = await prepararEntorno();
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("opai_app no lee clientes, tokens ni consentimientos", async () => {
    const app = e.appSinTenant;
    await expect(app.oauthClient.findMany()).rejects.toThrow(DENEGADO);
    await expect(app.oauthAccessToken.findMany()).rejects.toThrow(DENEGADO);
    await expect(app.oauthRefreshToken.findMany()).rejects.toThrow(DENEGADO);
    await expect(app.oauthConsent.findMany()).rejects.toThrow(DENEGADO);
  });

  it("opai_auth tiene lo justo y opai_app nada, en cada tabla", async () => {
    const filas = await e.admin.$queryRaw<{ tabla: string; rol: string; priv: string }[]>`
      SELECT table_name AS tabla, grantee AS rol, privilege_type AS priv
      FROM information_schema.role_table_grants
      WHERE table_schema = 'core' AND table_name LIKE 'oauth\\_%'
        AND grantee IN ('opai_app', 'opai_auth')`;
    for (const t of TABLAS) {
      const de = (rol: string) =>
        filas
          .filter((f) => f.tabla === t && f.rol === rol)
          .map((f) => f.priv)
          .sort();
      expect(de("opai_app"), t).toEqual([]);
      expect(de("opai_auth"), t).toEqual(["DELETE", "INSERT", "SELECT", "UPDATE"]);
    }
  });

  it("ninguna tabla OAuth tiene tenant_id: la empresa va en reference_id", async () => {
    const columnas = await e.admin.$queryRaw<{ tabla: string }[]>`
      SELECT table_name AS tabla FROM information_schema.columns
      WHERE table_schema = 'core' AND table_name LIKE 'oauth\\_%' AND column_name = 'tenant_id'`;
    expect(columnas).toEqual([]);
  });
});

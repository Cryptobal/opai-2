import { describe, expect, it } from "vitest";

import { limiteOAuth } from "../lib/oauth-limite";

// CAR-247: el registro de apps es público; se acota por IP y falla cerrado. Autorizar y canjear tokens
// también se acotan por IP. El resto de Better Auth sigue con sus propios límites.
describe("límites del OAuth del MCP por IP", () => {
  it("registrar apps: pocos por hora y falla cerrado", () => {
    expect(limiteOAuth("POST", "/api/auth/oauth2/register")).toMatchObject({
      ambito: "oauth-registro",
      maximo: 20,
      fallarCerrado: true,
    });
  });
  it("autorizar, token, revocar e introspección: por minuto", () => {
    for (const [m, ruta] of [
      ["GET", "/api/auth/oauth2/authorize"],
      ["POST", "/api/auth/oauth2/token"],
      ["POST", "/api/auth/oauth2/revoke"],
    ] as const)
      expect(limiteOAuth(m, ruta)).toMatchObject({ ambito: "oauth-ip", ventanaMs: 60_000 });
  });
  it("lo demás de /api/auth no se toca", () => {
    expect(limiteOAuth("POST", "/api/auth/sign-in/email")).toBeNull();
    expect(limiteOAuth("GET", "/api/auth/get-session")).toBeNull();
  });
});

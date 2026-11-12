import { describe, expect, it } from "vitest";

import {
  cabeceraDesafioMcp,
  emisorOAuth,
  metadatosRecursoMcp,
  urlMetadatosRecurso,
} from "../src/oauth-metadatos";

const BASE = "https://test.opai.cl";

describe("OAuth del MCP · descubrimiento (RFC 9728 y RFC 8414, CAR-247)", () => {
  it("el emisor es el servidor de Better Auth", () => {
    expect(emisorOAuth(BASE)).toBe("https://test.opai.cl/api/auth");
  });
  it("los metadatos del recurso apuntan al MCP, a su emisor y a sus alcances", () => {
    expect(metadatosRecursoMcp(BASE)).toEqual({
      resource: "https://test.opai.cl/api/mcp",
      authorization_servers: ["https://test.opai.cl/api/auth"],
      scopes_supported: ["mcp:leer", "mcp:escribir", "offline_access"],
      bearer_methods_supported: ["header"],
      resource_name: "OPAI 2.0",
    });
  });
  it("los metadatos viven en la ruta que corresponde al recurso /api/mcp", () => {
    expect(urlMetadatosRecurso(BASE)).toBe(
      "https://test.opai.cl/.well-known/oauth-protected-resource/api/mcp",
    );
  });
  it("el 401 del MCP le dice al cliente dónde descubrir cómo entrar", () => {
    expect(cabeceraDesafioMcp(BASE)).toBe(
      'Bearer realm="opai", resource_metadata="https://test.opai.cl/.well-known/oauth-protected-resource/api/mcp"',
    );
  });
});

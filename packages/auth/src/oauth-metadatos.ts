import { ALCANCES_OAUTH } from "./oauth-reglas";

// Descubrimiento del OAuth del MCP (CAR-247): qué publica OPAI para que una app como Claude sepa que
// /api/mcp está protegido y dónde pedir el token. Puro, sin Better Auth, para probarlo.

const base = (b?: string) => b ?? process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000";

/** Emisor de los tokens: el servidor de Better Auth (`basePath` /api/auth). */
export const emisorOAuth = (b?: string) => new URL("/api/auth", base(b)).toString();

/** Metadatos del recurso protegido (RFC 9728) para /api/mcp. */
export const metadatosRecursoMcp = (b?: string) => ({
  resource: new URL("/api/mcp", base(b)).toString(),
  authorization_servers: [emisorOAuth(b)],
  scopes_supported: [...ALCANCES_OAUTH],
  bearer_methods_supported: ["header"],
  resource_name: "OPAI 2.0",
});

/** Dónde se publican esos metadatos: `/.well-known/oauth-protected-resource` + ruta del recurso. */
export const urlMetadatosRecurso = (b?: string) =>
  new URL("/.well-known/oauth-protected-resource/api/mcp", base(b)).toString();

/** `WWW-Authenticate` del 401 del MCP, con el enlace a los metadatos (RFC 9728 §5.1). */
export const cabeceraDesafioMcp = (b?: string) =>
  `Bearer realm="opai", resource_metadata="${urlMetadatosRecurso(b)}"`;

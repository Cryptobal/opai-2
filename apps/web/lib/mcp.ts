import { createMcpHandler } from "mcp-handler";

import { ejecutarHerramienta, herramientasMcp } from "@opai/capabilities/mcp";

import pkg from "../package.json" with { type: "json" };
import { contextoDeApiKey } from "./api-key";
import { permitir, ipDe } from "./rate-limit";
import { asegurarRegistro } from "./registro";
import { demasiadas, noAutenticado } from "./respuestas";

/**
 * Servidor MCP de OPAI 2.0 (Streamable HTTP, sin estado). Autentica la API key, deriva las
 * herramientas del registro de capacidades visibles para esa key y ejecuta cada llamada como
 * "agente vía usuario". Nunca registra la key ni la URL en logs.
 */
export async function manejarMcp(req: Request, key: string | null): Promise<Response> {
  if (!permitir(`mcp-ip:${ipDe(req)}`, 120)) return demasiadas();
  if (!key) {
    const r = noAutenticado("Falta la API key: usa Authorization: Bearer <key>.");
    r.headers.set("WWW-Authenticate", 'Bearer realm="opai"');
    return r;
  }
  if (!permitir(`mcp-key:${key.slice(0, 24)}`, 300)) return demasiadas();

  asegurarRegistro();
  const ctx = await contextoDeApiKey(key);
  if (ctx instanceof Response) return ctx;

  const handler = createMcpHandler(
    (server) => {
      for (const h of herramientasMcp(ctx)) {
        server.registerTool(
          h.nombre,
          { title: h.capacidad.id, description: h.descripcion, inputSchema: h.input },
          async (args) => {
            const resultado = await ejecutarHerramienta(ctx, h, args);
            return {
              content: [{ type: "text" as const, text: JSON.stringify(resultado) }],
              isError: !resultado.ok,
            };
          },
        );
      }
    },
    {
      serverInfo: { name: "opai", version: pkg.version },
      instructions:
        "OPAI 2.0. Cada herramienta es una capacidad de negocio. Las que escriben tienen una versión preview_ que muestra el efecto sin guardar: úsala antes y confirma con el usuario.",
    },
  );
  return handler(req);
}

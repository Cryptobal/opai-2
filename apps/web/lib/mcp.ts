import { createMcpHandler } from "mcp-handler";

import { executeCapability, MANUALES } from "@opai/capabilities";
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

  // Lo que esta key debe ver. Se declara en `instructions` para que un cliente (o `pnpm mcp:verificar`)
  // detecte una lista de herramientas desactualizada o recortada de su lado.
  const herramientas = herramientasMcp(ctx);
  const reales = herramientas.filter((h) => !h.dryRun).length;
  const handler = createMcpHandler(
    (server) => {
      // Recursos (ADR-032): manuales para agentes y el esquema de ajustes visible para la key.
      for (const m of MANUALES) {
        server.registerResource(
          `manual-${m.id}`,
          `opai://manuales/${m.id}`,
          { title: m.titulo, mimeType: "text/markdown" },
          async (uri) => ({ contents: [{ uri: uri.href, text: m.texto }] }),
        );
      }
      server.registerResource(
        "ajustes-schema",
        "opai://ajustes/schema",
        { title: "Esquema de ajustes de la empresa", mimeType: "application/json" },
        async (uri) => ({
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(await executeCapability(ctx, "core.config.schema", {})),
            },
          ],
        }),
      );
      for (const h of herramientas) {
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
      instructions: `OPAI 2.0. Cada herramienta es una capacidad de negocio. Las que escriben tienen una versión preview_ que muestra el efecto sin guardar: úsala antes y confirma con el usuario. Lee el recurso opai://manuales/operar-el-nucleo antes de escribir. Esta key ve ${herramientas.length} herramientas (${reales} reales y ${herramientas.length - reales} preview_); si tu cliente lista menos, vuelve a descubrir las herramientas del servidor.`,
    },
  );
  return handler(req);
}

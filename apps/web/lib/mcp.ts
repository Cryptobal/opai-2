import { createMcpHandler } from "mcp-handler";

import { cabeceraDesafioMcp } from "@opai/auth";
import { executeCapability, MANUALES, slugDeApiKey } from "@opai/capabilities";
import { ejecutarHerramienta, herramientasMcp } from "@opai/capabilities/mcp";

import pkg from "../package.json" with { type: "json" };
import { contextoDeApiKey } from "./api-key";
import { contextoDeTokenOAuth } from "./oauth-mcp";
import { ipDe, LIMITES, permitir } from "./rate-limit";
import { asegurarRegistro } from "./registro";
import { demasiadas, noAutenticado } from "./respuestas";

/**
 * Servidor MCP de OPAI 2.0 (Streamable HTTP, sin estado). Autentica la API key o el token OAuth, deriva las
 * herramientas del registro de capacidades visibles para esa key y ejecuta cada llamada como
 * "agente vía usuario". Nunca registra la key ni la URL en logs.
 */
export async function manejarMcp(req: Request, key: string | null): Promise<Response> {
  if (!(await permitir(`mcp-ip:${ipDe(req)}`, LIMITES.apiPorIp.maximo))) return demasiadas();
  if (!key) {
    const r = noAutenticado("Falta la API key: usa Authorization: Bearer <key>.");
    r.headers.set("WWW-Authenticate", cabeceraDesafioMcp());
    return r;
  }

  asegurarRegistro();
  // Una API key lleva el slug de su empresa; lo demás es un token OAuth de una app (CAR-247).
  const ctx = slugDeApiKey(key) ? await contextoDeApiKey(key) : await contextoDeTokenOAuth(key);
  if (ctx instanceof Response) {
    // Token o key inválida: el cliente OAuth vuelve a descubrir cómo entrar (RFC 9728 §5.1).
    if (ctx.status === 401) ctx.headers.set("WWW-Authenticate", cabeceraDesafioMcp());
    return ctx;
  }
  // Cupo por key autenticada (apiKeyId), como /api/v1. Nunca por un prefijo de la key: con slugs
  // largos el prefijo es todo público y keys falsas agotarían el cupo de la key real (CAR-44). El
  // sondeo de keys antes de autenticar lo acota el límite por IP de arriba.
  if (!(await permitir(`mcp-key:${ctx.actor.id ?? "sistema"}`, LIMITES.apiPorPrincipal.maximo)))
    return demasiadas();

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

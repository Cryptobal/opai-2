import { htmlPendientes, URI_PENDIENTES } from "./pendientes";

/** Tipo MIME de una vista MCP App (spec 2026-01-26). */
export const MIME_VISTA = "text/html;profile=mcp-app";

type Servidor = {
  registerResource(
    nombre: string,
    uri: string,
    meta: { title: string; mimeType: string },
    leer: (uri: URL) => Promise<{ contents: { uri: string; mimeType: string; text: string }[] }>,
  ): unknown;
};

/** Herramienta MCP → vista que la dibuja dentro del cliente (CAR-287). */
export const VISTAS: Record<string, string> = { core_inicio_pendientes: URI_PENDIENTES };

/** `_meta` de una herramienta con vista, o undefined. */
export const metaDeVista = (herramienta: string) => {
  const uri = VISTAS[herramienta];
  // Clave nueva y la plana anterior, como el helper oficial, para clientes más antiguos.
  return uri ? { ui: { resourceUri: uri }, "ui/resourceUri": uri } : undefined;
};

/** Publica las vistas como recursos `ui://`. Solo HTML propio y autocontenido, sin datos. */
export function registrarVistas(server: Servidor, base: string): void {
  server.registerResource(
    "vista-pendientes",
    URI_PENDIENTES,
    { title: "Pendientes de OPAI", mimeType: MIME_VISTA },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: MIME_VISTA, text: htmlPendientes(base) }],
    }),
  );
}

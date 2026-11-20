/** Solo la fase local: no habilita Neon por recibir una etiqueta PREVIEW_RAMA. */
export function exigirDestinoComprasQaLocal(raw: string): void {
  const url = new URL(raw);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.search ||
    url.hash ||
    !/^\/opai_e2e_[a-z0-9_]+$/.test(url.pathname)
  ) {
    throw new Error("La fixture de compras requiere PostgreSQL efímero local opai_e2e_*.");
  }
}

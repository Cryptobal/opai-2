export { GET } from "../../route";

// Alias RFC 8414 del emisor en /api/auth: evita prerender estático de esta variante de ruta.
export const dynamic = "force-dynamic";

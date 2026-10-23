import { keyDeCabecera } from "@/lib/api-key";
import { manejarMcp } from "@/lib/mcp";

/** MCP con `Authorization: Bearer <key>` (forma recomendada). */
async function manejar(req: Request): Promise<Response> {
  return manejarMcp(req, keyDeCabecera(req));
}

export { manejar as DELETE, manejar as GET, manejar as POST };

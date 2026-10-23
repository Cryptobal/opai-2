import { manejarMcp } from "@/lib/mcp";

type Params = { params: Promise<{ key: string }> };

/**
 * MCP con la key en la URL, para clientes que no permiten cabeceras. Menos seguro (la URL puede
 * quedar en historiales y logs de terceros): la UI de API keys lo advierte. Aquí no se loguea.
 */
async function manejar(req: Request, { params }: Params): Promise<Response> {
  const { key } = await params;
  return manejarMcp(req, decodeURIComponent(key));
}

export { manejar as DELETE, manejar as GET, manejar as POST };

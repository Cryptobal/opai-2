import { manejarMcp } from "@/lib/mcp";

type Params = { params: Promise<{ key: string }> };

/**
 * MCP con la key en la URL: DEPRECADO (NÚCLEO-B). La key quedaba en historiales, logs de terceros y
 * del proxy. Por defecto responde 410 Gone y dice cómo migrar a `Authorization: Bearer` en `/api/mcp`.
 * Solo sigue funcionando si `MCP_KEY_EN_URL_HASTA` (fecha ISO) está definida y es futura: en ese caso
 * mide su uso (marca en logs, sin la key ni la IP) y agrega las cabeceras `Deprecation`/`Sunset`.
 */
function habilitadaHasta(): Date | null {
  const v = process.env["MCP_KEY_EN_URL_HASTA"];
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) || d.getTime() <= Date.now() ? null : d;
}

function gone(): Response {
  return Response.json(
    {
      ok: false,
      error: {
        code: "GONE",
        message:
          "La API key en la URL está deprecada. Conecta el MCP con la cabecera " +
          "Authorization: Bearer <key> en /api/mcp.",
      },
    },
    { status: 410, headers: { Link: '</api/mcp>; rel="successor-version"' } },
  );
}

async function manejar(req: Request, { params }: Params): Promise<Response> {
  const hasta = habilitadaHasta();
  if (!hasta) return gone();
  // Transición autorizada por la variable: marca de uso sin datos personales (ni la key ni la IP).
  console.warn(`[mcp] key en la URL usada (deprecada, permitida hasta ${hasta.toISOString()})`);
  const { key } = await params;
  const res = await manejarMcp(req, decodeURIComponent(key));
  res.headers.set("Deprecation", "true");
  res.headers.set("Sunset", hasta.toUTCString());
  res.headers.set("Link", '</api/mcp>; rel="successor-version"');
  return res;
}

export { manejar as DELETE, manejar as GET, manejar as POST };

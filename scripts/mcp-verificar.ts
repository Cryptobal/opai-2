/**
 * Verifica `tools/list` del MCP contra lo esperado (paridad UI↔MCP, ADR-034 §4).
 *
 *   OPAI_MCP_KEY=<key> pnpm mcp:verificar            # contra https://test.opai.cl/api/mcp
 *   OPAI_MCP_KEY=<key> OPAI_MCP_URL=<url> pnpm mcp:verificar
 *
 * La key se lee solo del entorno y nunca se imprime. Compara con lo que el propio servidor declara
 * en `instructions` ("Esta key ve N herramientas") y, para una key owner con scope "*", con la
 * instantánea `herramientas-mcp.txt`. Sale con código 1 si faltan herramientas.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env["OPAI_MCP_URL"] ?? "https://test.opai.cl/api/mcp";
const key = process.env["OPAI_MCP_KEY"];
if (!key) {
  console.error("Falta OPAI_MCP_KEY en el entorno.");
  process.exit(2);
}

type Rpc = { result?: Record<string, unknown> & { tools?: { name: string }[] } };

async function rpc(method: string, params: unknown, id: number): Promise<Rpc> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
  return JSON.parse(/\{.*\}/s.exec(await res.text())?.[0] ?? "{}") as Rpc;
}

async function main(): Promise<number> {
  const init = await rpc(
    "initialize",
    {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "mcp-verificar", version: "1" },
    },
    1,
  );
  const declaradas = /Esta key ve (\d+) herramientas/.exec(
    String(init.result?.["instructions"] ?? ""),
  )?.[1];

  const nombres: string[] = [];
  let cursor: string | undefined;
  do {
    const r = await rpc("tools/list", cursor ? { cursor } : {}, 2);
    nombres.push(...(r.result?.tools ?? []).map((t) => t.name));
    cursor = r.result?.["nextCursor"] as string | undefined;
  } while (cursor);

  const esperadas = readFileSync(
    join(__dirname, "../packages/capabilities/test/__snapshots__/herramientas-mcp.txt"),
    "utf8",
  )
    .split("\n")
    .filter(Boolean);
  const vistas = new Set(nombres);
  const faltan = esperadas.filter((n) => !vistas.has(n));
  const sobran = nombres.filter((n) => !esperadas.includes(n));

  console.log(`Servidor: ${url}`);
  console.log(`tools/list: ${nombres.length} herramientas`);
  console.log(`El servidor declara: ${declaradas ?? "(no declara; build anterior a este cambio)"}`);
  console.log(`Instantánea (owner, scope *): ${esperadas.length}`);
  if (faltan.length)
    console.log(`Faltan respecto de la instantánea (${faltan.length}):\n  ${faltan.join("\n  ")}`);
  if (sobran.length)
    console.log(`Sobran respecto de la instantánea (${sobran.length}):\n  ${sobran.join("\n  ")}`);
  if (declaradas && Number(declaradas) !== nombres.length) {
    console.log("DIFERENCIA: el servidor declara más de lo que entregó tools/list.");
    return 1;
  }
  return faltan.length && !declaradas ? 1 : 0;
}

// Sin await de nivel superior: tsx ejecuta este archivo como CJS.
main().then(
  (codigo) => process.exit(codigo),
  (e: unknown) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  },
);

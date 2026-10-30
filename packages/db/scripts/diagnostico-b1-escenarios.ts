// Escenarios del diagnóstico de B1 (ver diagnostico-b1-sesiones.ts). Separado para respetar el
// límite de 150 líneas por archivo.
import { Client, Pool } from "pg";

import { PrismaPg } from "@prisma/adapter-pg";

import { configPool } from "../src/config-pool";
import { PrismaClient } from "../src/generated/prisma/client";

/** Consulta exacta de medición sobre pg_stat_activity (se imprime en el informe). */
export const CONSULTA_MEDICION = `
SELECT state,
       count(*)::int AS conexiones,
       round(max(extract(epoch FROM (now() - xact_start)))::numeric, 1) AS max_edad_s,
       max(wait_event) AS wait_event
FROM pg_stat_activity
WHERE datname = current_database()
  AND usename = current_user
  AND pid <> pg_backend_pid()
  AND state = 'idle in transaction'
GROUP BY state`;

type Muestra = { conexiones: number; maxEdadS: number; waitEvent: string | null };

export async function medir(obs: Client): Promise<Muestra> {
  const r = await obs.query(CONSULTA_MEDICION);
  const fila = r.rows[0] as
    | { conexiones: number; max_edad_s: string; wait_event: string | null }
    | undefined;
  return fila
    ? { conexiones: fila.conexiones, maxEdadS: Number(fila.max_edad_s), waitEvent: fila.wait_event }
    : { conexiones: 0, maxEdadS: 0, waitEvent: null };
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Abre la transacción de auth y la abandona (no hace COMMIT), con el tope de idle indicado. */
async function abandonarTxAuth(url: string, idle: string): Promise<Client> {
  const c = new Client({ connectionString: url });
  // Postgres corta estas conexiones (25P03) y pg lo emite como evento `error`: hay que escucharlo
  // para que no tumbe el proceso; aquí el corte es justo lo que queremos observar.
  c.on("error", () => undefined);
  await c.connect();
  await c.query(`SET idle_in_transaction_session_timeout = '${idle}'`);
  await c.query("BEGIN");
  await c.query("SET LOCAL ROLE opai_auth");
  await c.query("SELECT token FROM core.sessions LIMIT 1").catch(() => undefined);
  return c;
}

export async function escenarioSinTope(obs: Client, url: string, n: number) {
  console.log(`\n== Escenario 1 · ${n} transacciones de auth abandonadas SIN tope (emula el`);
  console.log("   congelamiento de la función de Vercel; en vivo se midieron hasta 167 s) ==");
  const conns = await Promise.all(Array.from({ length: n }, () => abandonarTxAuth(url, "0")));
  for (const s of [0, 2, 4, 6]) {
    const m = await medir(obs);
    console.log(`  t+${s}s: idle_in_transaction=${m.conexiones}, max_edad=${m.maxEdadS}s, wait=${m.waitEvent}`);
    if (s < 6) await dormir(2000);
  }
  console.log("  → sin tope, las conexiones NO se cierran: retienen su slot del pool indefinidamente.");
  await Promise.all(conns.map((c) => c.end().catch(() => undefined)));
}

export async function escenario5s(obs: Client, url: string, n: number) {
  console.log(`\n== Escenario 2 · ${n} transacciones de auth abandonadas con idle=5s (punto 2) ==`);
  const conns = await Promise.all(Array.from({ length: n }, () => abandonarTxAuth(url, "5s")));
  let muertasEn = -1;
  for (let s = 0; s <= 8; s++) {
    const m = await medir(obs);
    console.log(`  t+${s}s: idle_in_transaction=${m.conexiones}, max_edad=${m.maxEdadS}s`);
    if (m.conexiones === 0 && muertasEn < 0 && s > 0) muertasEn = s;
    if (s < 8) await dormir(1000);
  }
  console.log(
    muertasEn >= 0
      ? `  → Postgres cortó las conexiones (25P03) a ~${muertasEn}s: sueltan el slot del pool.`
      : "  → (no se observó el corte en la ventana; revisar el tope del rol).",
  );
  await Promise.all(conns.map((c) => c.end().catch(() => undefined)));
}

async function tieneFuncion(obs: Client): Promise<boolean> {
  const r = await obs.query(
    "SELECT 1 FROM pg_proc WHERE proname = 'auth_sesion_por_token' AND pronamespace = 'core'::regnamespace",
  );
  return (r.rowCount ?? 0) > 0;
}

export async function escenarioFuncion(obs: Client, url: string) {
  console.log("\n== Escenario 3 · lectura de sesión vía función SECURITY DEFINER (punto 3) ==");
  if (!(await tieneFuncion(obs))) {
    console.log("  (la función aún no existe; se mide tras aplicar la migración del punto 2/3)");
    return;
  }
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query("SELECT * FROM core.auth_sesion_por_token($1)", ["token-inexistente"]);
  console.log(`  idle_in_transaction del rol tras la lectura por función = ${(await medir(obs)).conexiones}`);
  console.log("  → la lectura hot path ya no abre transacción: no puede quedar «idle in transaction».");
  await c.end();
}

function clientePrisma(url: string, max: number, maxWait: number): PrismaClient {
  const pool = new Pool({ ...configPool(process.env, url, false), max });
  return new PrismaClient({
    adapter: new PrismaPg(pool, { disposeExternalPool: true }),
    transactionOptions: { maxWait, timeout: 15_000 },
  });
}

export async function escenarioP2028(obs: Client, url: string) {
  console.log("\n== Escenario 4 · ANTES: P2028 cuando las conexiones pegadas saturan el pool ==");
  const prisma = clientePrisma(url, 3, 1000);
  const ocupar = Array.from({ length: 3 }, () =>
    prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SELECT pg_sleep(4)");
    }).catch(() => undefined),
  );
  await dormir(500);
  const ocup = await obs.query(
    `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database()
       AND usename = current_user AND pid <> pg_backend_pid()
       AND state IN ('active', 'idle in transaction')`,
  );
  console.log(`  pool saturado: conexiones del rol reteniendo slot ≈ ${(ocup.rows[0] as { n: number }).n}`);
  let p2028 = 0;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SELECT 1");
    });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "P2028" || /start a transaction/i.test(String(err.message))) p2028 = 1;
    console.log(`  4.ª transacción rechazada: code=${err.code ?? "?"} (${err.message?.split("\n")[0]})`);
  }
  console.log(`  → P2028 observados = ${p2028} (la contención del pool se vuelve P2028 aguas abajo).`);
  await Promise.allSettled(ocupar);
  await prisma.$disconnect();
}

export async function escenarioDespues(obs: Client, url: string) {
  console.log("\n== Escenario 5 · DESPUÉS: ráfaga de 20 lecturas de sesión por función ==");
  if (!(await tieneFuncion(obs))) {
    console.log("  (la función aún no existe; se mide tras aplicar la migración)");
    return;
  }
  const prisma = clientePrisma(url, 5, 1000);
  const lecturas = Array.from({ length: 20 }, () =>
    prisma
      .$queryRaw`SELECT * FROM core.auth_sesion_por_token(${"token-inexistente"})`.then(() => null)
      .catch((e: { code?: string; message?: string }) =>
        e.code === "P2028" || /start a transaction/i.test(String(e.message)) ? "P2028" : "otro",
      ),
  );
  const res = await Promise.all(lecturas);
  const p2028 = res.filter((r) => r === "P2028").length;
  console.log(
    `  20 lecturas por función concurrentes: P2028=${p2028}, idle_in_transaction=${(await medir(obs)).conexiones}`,
  );
  console.log("  → las lecturas no abren transacción: no saturan el pool ni dejan idle-in-tx.");
  await prisma.$disconnect();
}

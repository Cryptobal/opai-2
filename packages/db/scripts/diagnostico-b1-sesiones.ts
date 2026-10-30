// Diagnóstico de la causa raíz de B1 (transacciones de sesión que quedan abiertas: P2028, 25P03,
// idle in transaction). No cambia datos: abre y abandona transacciones de la forma exacta que usa
// el cliente de Better Auth (`clienteAuth()`): `BEGIN; SET LOCAL ROLE opai_auth; SELECT ... ; (sin
// COMMIT)`, y mide con pg_stat_activity cuántas conexiones quedan «idle in transaction» y cuánto
// duran. Reproduce también el P2028 de Prisma cuando esas conexiones pegadas saturan el pool.
//
// Uso: pnpm --filter @opai/db diagnostico:b1    (necesita DATABASE_URL, rol opai_app).
// Conecta como opai_app (DATABASE_URL), que es el rol real de la app: así los topes por rol
// (idle_in_transaction_session_timeout del ALTER ROLE) rigen igual que en producción.
import { Client, Pool } from "pg";

import { PrismaPg } from "@prisma/adapter-pg";

import { configPool } from "../src/config-pool";
import { PrismaClient } from "../src/generated/prisma/client";

const urlEnv = process.env["DATABASE_URL"];
if (!urlEnv || !urlEnv.trim()) throw new Error("Falta DATABASE_URL (rol opai_app).");
const url: string = urlEnv;

// La consulta exacta de medición (se imprime en el informe).
const CONSULTA_MEDICION = `
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

async function medir(obs: Client): Promise<Muestra> {
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
async function abandonarTxAuth(idle: string): Promise<Client> {
  const c = new Client({ connectionString: url });
  // Postgres corta estas conexiones (25P03) y pg lo emite como evento `error`: hay que escucharlo
  // para que no tumbe el proceso; aquí el corte es justo lo que queremos observar.
  c.on("error", () => undefined);
  await c.connect();
  await c.query(`SET idle_in_transaction_session_timeout = '${idle}'`);
  await c.query("BEGIN");
  await c.query("SET LOCAL ROLE opai_auth");
  // La lectura hot path de getSession (sesión por token); da igual si devuelve 0 filas.
  await c.query("SELECT token FROM core.sessions LIMIT 1").catch(() => undefined);
  // No se hace COMMIT ni ROLLBACK: la conexión queda «idle in transaction».
  return c;
}

async function escenarioSinTope(obs: Client, n: number) {
  console.log(`\n== Escenario 1 · ${n} transacciones de auth abandonadas SIN tope (emula el`);
  console.log("   congelamiento de la función de Vercel; en vivo se midieron hasta 167 s) ==");
  const conns = await Promise.all(Array.from({ length: n }, () => abandonarTxAuth("0")));
  for (const s of [0, 2, 4, 6]) {
    const m = await medir(obs);
    console.log(
      `  t+${s}s: idle_in_transaction=${m.conexiones}, max_edad=${m.maxEdadS}s, wait=${m.waitEvent}`,
    );
    if (s < 6) await dormir(2000);
  }
  console.log("  → sin tope, las conexiones NO se cierran: retienen su slot del pool indefinidamente.");
  await Promise.all(conns.map((c) => c.end().catch(() => undefined)));
}

async function escenario5s(obs: Client, n: number) {
  console.log(`\n== Escenario 2 · ${n} transacciones de auth abandonadas con idle=5s (punto 2) ==`);
  const conns = await Promise.all(Array.from({ length: n }, () => abandonarTxAuth("5s")));
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

async function escenarioFuncion(obs: Client) {
  console.log("\n== Escenario 3 · lectura de sesión vía función SECURITY DEFINER (punto 3) ==");
  const c = new Client({ connectionString: url });
  await c.connect();
  const existe = await c.query(
    "SELECT 1 FROM pg_proc WHERE proname = 'auth_sesion_por_token' AND pronamespace = 'core'::regnamespace",
  );
  if (existe.rowCount === 0) {
    console.log("  (la función aún no existe; se mide después de aplicar la migración del punto 2/3)");
    await c.end();
    return;
  }
  // Lectura como una sola sentencia autocommit (sin BEGIN): no abre transacción.
  await c.query("SELECT * FROM core.auth_sesion_por_token($1)", ["token-inexistente"]);
  const m = await medir(obs);
  console.log(`  idle_in_transaction del rol tras la lectura por función = ${m.conexiones}`);
  console.log("  → la lectura hot path ya no abre transacción: no puede quedar «idle in transaction».");
  await c.end();
}

async function escenarioDespues(obs: Client) {
  console.log("\n== Escenario 5 · DESPUÉS: ráfaga de 20 lecturas de sesión por función ==");
  const existe = await obs.query(
    "SELECT 1 FROM pg_proc WHERE proname = 'auth_sesion_por_token' AND pronamespace = 'core'::regnamespace",
  );
  if (existe.rowCount === 0) {
    console.log("  (la función aún no existe; se mide tras aplicar la migración)");
    return;
  }
  const pool = new Pool({ ...configPool(process.env, url, false), max: 5 });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, { disposeExternalPool: true }),
    transactionOptions: { maxWait: 1000, timeout: 15_000 },
  });
  // 20 lecturas hot path concurrentes como las de getSession: una sentencia autocommit cada una.
  const lecturas = Array.from({ length: 20 }, () =>
    prisma
      .$queryRaw`SELECT * FROM core.auth_sesion_por_token(${"token-inexistente"})`.then(() => null)
      .catch((e: { code?: string; message?: string }) =>
        e.code === "P2028" || /start a transaction/i.test(String(e.message)) ? "P2028" : "otro",
      ),
  );
  const res = await Promise.all(lecturas);
  const p2028 = res.filter((r) => r === "P2028").length;
  const m = await medir(obs);
  console.log(`  20 lecturas por función concurrentes: P2028=${p2028}, idle_in_transaction=${m.conexiones}`);
  console.log("  → las lecturas no abren transacción: no saturan el pool ni dejan idle-in-tx.");
  await prisma.$disconnect();
}

async function escenarioP2028(obs: Client) {
  console.log("\n== Escenario 4 · ANTES: P2028 de Prisma cuando las conexiones pegadas saturan el pool ==");
  const pool = new Pool({ ...configPool(process.env, url, false), max: 3 });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, { disposeExternalPool: true }),
    transactionOptions: { maxWait: 1000, timeout: 15_000 },
  });
  // Ocupa el pool (max 3) con 3 transacciones que duermen reteniendo la conexión.
  const ocupar = Array.from({ length: 3 }, () =>
    prisma
      .$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SELECT pg_sleep(4)");
      })
      .catch(() => undefined),
  );
  await dormir(500);
  const ocup = await obs.query(
    `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database()
       AND usename = current_user AND pid <> pg_backend_pid()
       AND state IN ('active', 'idle in transaction')`,
  );
  console.log(`  pool saturado: conexiones del rol reteniendo slot ≈ ${(ocup.rows[0] as { n: number }).n}`);
  // Una 4.ª transacción no consigue conexión dentro de maxWait=1s → P2028.
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

async function main() {
  console.log("Diagnóstico B1 · transacciones de sesión abiertas");
  console.log("Consulta de medición (pg_stat_activity):");
  console.log(CONSULTA_MEDICION);

  const obs = new Client({ connectionString: url });
  await obs.connect();
  const info = await obs.query(
    "SELECT current_user AS u, current_setting('idle_in_transaction_session_timeout') AS idle, current_setting('statement_timeout') AS stmt, current_setting('lock_timeout') AS lock",
  );
  console.log("\nRol y topes de ESTA conexión:", info.rows[0]);

  await escenarioSinTope(obs, 3);
  await escenario5s(obs, 3);
  await escenarioFuncion(obs);
  await escenarioP2028(obs);
  await escenarioDespues(obs);

  await obs.end();
  console.log("\nListo.");
}

main().catch((e) => {
  console.error("Diagnóstico falló:", e);
  process.exit(1);
});

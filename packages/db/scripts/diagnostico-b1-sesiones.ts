// Diagnóstico de la causa raíz de B1 (transacciones de sesión que quedan abiertas: P2028, 25P03,
// idle in transaction). No cambia datos: abre y abandona transacciones de la forma exacta que usa
// el cliente de Better Auth (`clienteAuth()`): `BEGIN; SET LOCAL ROLE opai_auth; SELECT ...` sin
// COMMIT, y mide con pg_stat_activity cuántas conexiones quedan «idle in transaction» y cuánto
// duran. Reproduce también el P2028 de Prisma cuando esas conexiones pegadas saturan el pool, y el
// DESPUÉS: 20 lecturas de sesión por función con 0 P2028 y 0 idle-in-tx.
//
// Uso: pnpm --filter @opai/db diagnostico:b1    (necesita DATABASE_URL, rol opai_app).
// Conecta como opai_app (DATABASE_URL), el rol real de la app: así los topes por rol
// (idle_in_transaction_session_timeout del ALTER ROLE) rigen igual que en producción.
import { Client } from "pg";

import {
  CONSULTA_MEDICION,
  escenario5s,
  escenarioDespues,
  escenarioFuncion,
  escenarioP2028,
  escenarioSinTope,
} from "./diagnostico-b1-escenarios";

const urlEnv = process.env["DATABASE_URL"];
if (!urlEnv || !urlEnv.trim()) throw new Error("Falta DATABASE_URL (rol opai_app).");
const url: string = urlEnv;

async function main() {
  console.log("Diagnóstico B1 · transacciones de sesión abiertas");
  console.log("Consulta de medición (pg_stat_activity):");
  console.log(CONSULTA_MEDICION);

  const obs = new Client({ connectionString: url });
  await obs.connect();
  const info = await obs.query(
    "SELECT current_user AS u, current_setting('idle_in_transaction_session_timeout') AS idle," +
      " current_setting('statement_timeout') AS stmt, current_setting('lock_timeout') AS lock",
  );
  console.log("\nRol y topes de ESTA conexión:", info.rows[0]);

  await escenarioSinTope(obs, url, 3);
  await escenario5s(obs, url, 3);
  await escenarioFuncion(obs, url);
  await escenarioP2028(obs, url);
  await escenarioDespues(obs, url);

  await obs.end();
  console.log("\nListo.");
}

main().catch((e) => {
  console.error("Diagnóstico falló:", e);
  process.exit(1);
});

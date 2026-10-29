// Prueba de carga del pool contra Postgres real (solo `pnpm test:db`). Reproduce el P2028
// («Unable to start a transaction in the given time») del PR #134/B1 y verifica que con el `maxWait`
// por defecto de `configTransaccion` una ráfaga de ~20 transacciones concurrentes termina sin él.
//
// Cómo correrla aislada:
//   pnpm --filter @opai/db exec vitest run test/pool-carga-db.test.ts
// (necesita DATABASE_URL_TEST, igual que el resto de `pnpm test:db`).
import { afterAll, describe, expect, it } from "vitest";

import { PrismaPg } from "@prisma/adapter-pg";

import { configPool, configTransaccion } from "../src/config-pool";
import { PrismaClient } from "../src/generated/prisma/client";
import { crearPool } from "../src/pool";
import { urlPropietario } from "./entorno";

const url = urlPropietario as string;
// Un UUID cualquiera: `set_config('app.tenant_id', …, true)` solo fija el GUC por transacción
// (nunca SET/SET LOCAL), como en producción; `pg_sleep` retiene la conexión para forzar la contención.
const TENANT = "00000000-0000-7000-8000-000000000000";

const porCerrar: PrismaClient[] = [];
afterAll(async () => {
  await Promise.all(porCerrar.map((c) => c.$disconnect()));
});

function cliente(max: number, maxWait: number): PrismaClient {
  const pool = crearPool({ ...configPool(process.env, url, false), max }, false);
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, { disposeExternalPool: true }),
    transactionOptions: { maxWait, timeout: 15_000 },
  });
  porCerrar.push(prisma);
  return prisma;
}

/** Ráfaga de `n` transacciones interactivas concurrentes; cada una fija el tenant y duerme. */
async function rafaga(prisma: PrismaClient, n: number, segundos: number) {
  const uno = () =>
    prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${TENANT}, true)`;
      await tx.$executeRawUnsafe(`SELECT pg_sleep(${segundos})`);
    });
  const resultados = await Promise.allSettled(Array.from({ length: n }, uno));
  const p2028 = resultados.filter(
    (r) =>
      r.status === "rejected" &&
      ((r.reason as { code?: string })?.code === "P2028" ||
        /start a transaction/i.test(String((r.reason as { message?: string })?.message ?? ""))),
  ).length;
  const rechazos = resultados.filter((r) => r.status === "rejected").length;
  return { p2028, rechazos };
}

describe("carga del pool: P2028 bajo contención (PR #134, B1)", () => {
  it("reproduce P2028 con el maxWait corto que traía Prisma por defecto (2 s) y el pool saturado", async () => {
    // Pool de 2 y `maxWait` 50 ms: 20 transacciones que duermen 100 ms no consiguen conexión a tiempo.
    const { p2028 } = await rafaga(cliente(2, 50), 20, 0.1);
    expect(p2028).toBeGreaterThan(0);
  });

  it("con el maxWait por defecto configurado, ~20 transacciones concurrentes terminan sin P2028", async () => {
    const { maxWait } = configTransaccion(process.env);
    expect(maxWait).toBeGreaterThanOrEqual(10_000);
    // Mismo pool chico (5) que amplifica la contención; con el maxWait real la cola del pool las drena.
    const { p2028, rechazos } = await rafaga(cliente(5, maxWait), 20, 0.05);
    expect(p2028).toBe(0);
    expect(rechazos).toBe(0);
  });
});

// Prueba de carga P2028 con la FORMA de un render de `/configuracion/*` (B1, 4.º ajuste, sigue al
// #135). Reproduce el P2028 («Unable to start a transaction in the given time») bajo contención del
// pool y verifica que 20 renders paralelos con el `maxWait` real terminan sin él, contra el Postgres
// local (solo `pnpm test:db`).
//
// Qué modela cada "render" (medido en el código, mismo mix de transacciones que un GET con sesión):
//   - lecturas en ARRAY (forTenant/forUser y Better Auth: `$transaction([set_config|SET ROLE, query])`):
//     sesión + usuario (Better Auth) + membresías + acceso con módulos ≈ 4.
//   - lecturas en transacción INTERACTIVA (enLectura, ADR-045: BEGIN; set_config; query; COMMIT):
//     core.modules.list + core.resumen.contadores + core.config.get ≈ 3 (ANTES eran 5: este ajuste
//     saca `core.config.schema`, que no consulta la base, de la transacción de tenant, `sinDb`).
// Cada transacción interactiva retiene una conexión varios viajes de ida y vuelta; bajo ráfaga son
// las que más tensionan el pool. Nunca usa SET/SET LOCAL de sesión: el tenant va con
// `set_config('app.tenant_id', …, true)`, local a la transacción, como en producción.
//
// Cómo correrla aislada:
//   pnpm --filter @opai/db exec vitest run test/carga-configuracion-db.test.ts
// (necesita DATABASE_URL_TEST, igual que el resto de `pnpm test:db`).
import { afterAll, describe, expect, it } from "vitest";

import { PrismaPg } from "@prisma/adapter-pg";

import { configPool, configTransaccion } from "../src/config-pool";
import { PrismaClient } from "../src/generated/prisma/client";
import { crearPool } from "../src/pool";
import { urlPropietario } from "./entorno";

const url = urlPropietario as string;
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

type Forma = { arrays: number; interactivas: number; segundos: number };

/** Una lectura en array: fija el tenant y consulta, en una sola transacción batcheada. */
function leeArray(prisma: PrismaClient) {
  return prisma.$transaction([
    prisma.$executeRaw`SELECT set_config('app.tenant_id', ${TENANT}, true)`,
    prisma.$queryRaw`SELECT 1`,
  ]);
}

/** Una lectura en transacción interactiva (enLectura): retiene la conexión mientras consulta. */
function leeInteractiva(prisma: PrismaClient, segundos: number) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${TENANT}, true)`;
    await tx.$executeRawUnsafe(`SELECT pg_sleep(${segundos})`);
  });
}

/** Un render de `/configuracion`: dispara sus lecturas en paralelo (como el `Promise.all` real). */
function render(prisma: PrismaClient, f: Forma) {
  const tareas = [
    ...Array.from({ length: f.arrays }, () => leeArray(prisma)),
    ...Array.from({ length: f.interactivas }, () => leeInteractiva(prisma, f.segundos)),
  ];
  return Promise.allSettled(tareas);
}

async function rafagaRenders(prisma: PrismaClient, nRenders: number, f: Forma) {
  const resultados = (await Promise.all(Array.from({ length: nRenders }, () => render(prisma, f)))).flat();
  const esP2028 = (r: PromiseSettledResult<unknown>) =>
    r.status === "rejected" &&
    ((r.reason as { code?: string })?.code === "P2028" ||
      /start a transaction|expired transaction/i.test(
        String((r.reason as { message?: string })?.message ?? ""),
      ));
  return {
    p2028: resultados.filter(esP2028).length,
    rechazos: resultados.filter((r) => r.status === "rejected").length,
  };
}

describe("carga de /configuracion: P2028 bajo ráfaga de renders (B1, 4.º ajuste)", () => {
  it("reproduce P2028 con el pool saturado y el maxWait corto que traía Prisma (ANTES)", async () => {
    // Pool de 2 y maxWait 100 ms: 20 renders con 5 lecturas interactivas de 80 ms no consiguen
    // conexión a tiempo. Es la situación del #135 amplificada (prefetch del riel + revalidación).
    const { p2028 } = await rafagaRenders(cliente(2, 100), 20, {
      arrays: 4,
      interactivas: 5,
      segundos: 0.08,
    });
    expect(p2028).toBeGreaterThan(0);
  });

  it("20 renders paralelos de /configuracion con el maxWait real terminan sin P2028 (DESPUÉS)", async () => {
    const { maxWait } = configTransaccion(process.env);
    expect(maxWait).toBeGreaterThanOrEqual(10_000);
    // Pool chico (5) que amplifica la contención, maxWait real y la forma reducida del render (3
    // interactivas tras sacar `core.config.schema`): la cola del pool las drena sin P2028.
    const { p2028, rechazos } = await rafagaRenders(cliente(5, maxWait), 20, {
      arrays: 4,
      interactivas: 3,
      segundos: 0.03,
    });
    expect(p2028).toBe(0);
    expect(rechazos).toBe(0);
  });
});

// Diagnóstico de solo lectura (NÚCLEO-D1): lista las membresías cuyo rol y portales son incoherentes
// (Cliente, Plataforma, rol o portales desconocidos; ver `@opai/domain/portales`). No cambia
// datos: la corrección, si Carlos la pide, es una tarea aparte con su propio brief.
// Uso: DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db diagnostico:portales
import "dotenv/config";

import { esRol, portalesIncoherentes } from "@opai/domain";

import { cerrarClientes, dbAdmin } from "../src/index";

async function main(): Promise<void> {
  const db = dbAdmin();
  const membresias = await db.membership.findMany({
    orderBy: [{ tenantId: "asc" }, { createdAt: "asc" }],
  });
  const incoherentes = membresias
    .map((m) => ({
      m,
      portales: esRol(m.rol) ? portalesIncoherentes(m.rol, m.portales) : ["rol desconocido"],
    }))
    .filter((x) => x.portales.length > 0);
  if (incoherentes.length === 0) {
    console.log("Sin membresías incoherentes.");
    return;
  }
  console.log(`${incoherentes.length} membresía(s) incoherente(s):`);
  for (const { m, portales } of incoherentes) {
    console.log(
      `- tenant ${m.tenantId} · membresía ${m.id} · rol "${m.rol}" · portal(es) incoherente(s): ${portales.join(", ")}`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

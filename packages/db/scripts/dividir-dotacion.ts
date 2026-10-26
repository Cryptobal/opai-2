// Brief 11 · Puestos PR 1 (CAR-8). Divide los puestos con `dotacion > 1` en N puestos (1 puesto =
// 1 posición), como decidió Carlos (decisión 1 del alcance). La columna `dotacion` queda deprecada.
// Lo ejecuta Carlos, no el PR. La lógica está en `dividir-dotacion-nucleo.ts` (con pruebas).
//
// Uso (rol propietario de la base indicada):
//   … tsx scripts/dividir-dotacion.ts                         simula en todos los tenants (resumen)
//   … tsx scripts/dividir-dotacion.ts --tenant <id|slug>      simula en un tenant (detalle)
//   … tsx scripts/dividir-dotacion.ts --tenant <id|slug> --apply   aplica en ese tenant
// con `DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db exec` delante.
//
// --apply exige --tenant y escribe ANTES un respaldo con el plan y DESPUÉS el mapa
// original → copias (con la dotación original) en `respaldo-dividir-dotacion-<tenant>-<fecha>.json`
// (o en la ruta de --respaldo). Idempotente: una segunda corrida no encuentra nada que dividir.
//
// Cómo revertir con el respaldo: por cada entrada de `puestos`, borrar las estructuras de sueldo de
// nivel puesto de cada `copias[].id` (sus ítems se borran en cascada), borrar esos puestos y volver a
// poner `dotacion = dotacionOriginal` en `originalId`. Solo vale mientras las copias no tengan
// asignaciones (PR 2 en adelante).
import "dotenv/config";
import { writeFileSync } from "node:fs";

import { cerrarClientes, dbAdmin } from "../src/index";
import { dividirDotacion, type ResultadoDivision } from "./dividir-dotacion-nucleo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function imprimir(r: ResultadoDivision, slug: string): void {
  console.log(
    r.aplicado ? "== División aplicada ==" : "== Simulación (usa --apply para escribir) ==",
  );
  console.log(`Tenant: ${slug} (${r.tenantId})`);
  console.log(`Puestos con dotación > 1: ${r.puestos.length}`);
  console.log(`Posiciones nuevas: ${r.puestos.reduce((s, p) => s + p.copias.length, 0)}`);
  console.log(
    `Estructuras de sueldo de nivel puesto copiadas: ${r.puestos.reduce((s, p) => s + p.estructurasCopiadas, 0)}`,
  );
  for (const p of r.puestos)
    console.log(
      `  ${p.nombre} (${p.originalId}): ${p.dotacionOriginal} → 1 + ${p.copias.map((c) => c.nombre).join(", ")}`,
    );
  if (r.saltados.length)
    console.log(`Saltados (ya divididos por otra corrida): ${r.saltados.join(", ")}`);
}

async function main(): Promise<void> {
  const db = dbAdmin();
  const aplicar = process.argv.includes("--apply");
  const clave = argumento("--tenant");
  if (!clave) {
    if (aplicar) throw new Error("--apply exige --tenant <id|slug>.");
    const grupos = await db.puesto.groupBy({
      by: ["tenantId"],
      where: { dotacion: { gt: 1 } },
      _count: { _all: true },
      _sum: { dotacion: true },
    });
    console.log("== Simulación por tenant (usa --tenant <id|slug> para el detalle) ==");
    if (grupos.length === 0) console.log("No hay puestos con dotación mayor que 1.");
    for (const g of grupos)
      console.log(
        `  tenant ${g.tenantId}: ${g._count._all} puesto(s) → ${g._sum.dotacion ?? 0} posiciones`,
      );
    return;
  }
  const tenant = await db.tenant.findFirst({
    where: UUID.test(clave) ? { id: clave } : { slug: clave },
  });
  if (!tenant) throw new Error(`No existe el tenant "${clave}".`);
  const ruta =
    argumento("--respaldo") ??
    `respaldo-dividir-dotacion-${tenant.slug}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  if (aplicar) {
    const plan = await dividirDotacion(db, { tenantId: tenant.id, aplicar: false });
    writeFileSync(ruta, JSON.stringify({ estado: "plan", ...plan }, null, 2));
  }
  const r = await dividirDotacion(db, {
    tenantId: tenant.id,
    aplicar,
    alAplicar: (parcial) =>
      writeFileSync(ruta, JSON.stringify({ estado: "en_curso", ...parcial }, null, 2)),
  });
  if (aplicar) {
    writeFileSync(ruta, JSON.stringify({ estado: "aplicado", ...r }, null, 2));
    console.log(`Respaldo: ${ruta}`);
  }
  imprimir(r, tenant.slug);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

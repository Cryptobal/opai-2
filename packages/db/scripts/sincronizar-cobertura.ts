// CAR-207 · Backfill único de la cobertura de los puestos (ver `sincronizar-cobertura-nucleo.ts`).
// Lo ejecuta Carlos con vista previa, no el PR.
//
// Uso (rol propietario con BYPASSRLS de la base indicada):
//   … tsx scripts/sincronizar-cobertura.ts --tenant <id|slug>            simula y lista los cambios
//   … tsx scripts/sincronizar-cobertura.ts --tenant <id|slug> --apply    escribe
// con `DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db exec` delante.
// --apply deja el respaldo (valores anteriores) en `respaldo-cobertura-<tenant>-<fecha>.json` (o
// --respaldo <ruta>). Idempotente: una segunda corrida no encuentra nada que cambiar. Para revertir,
// volver a poner `antes` en cada puesto del respaldo.
import "dotenv/config";
import { writeFileSync } from "node:fs";

import { cerrarClientes, dbAdmin } from "../src/index";
import { sincronizarCobertura } from "./sincronizar-cobertura-nucleo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const argumento = (n: string) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main(): Promise<void> {
  const db = dbAdmin();
  const aplicar = process.argv.includes("--apply");
  const clave = argumento("--tenant");
  if (!clave) throw new Error("Indica --tenant <id|slug>.");
  // Con FORCE RLS y un rol sin BYPASSRLS las lecturas devuelven 0 filas sin error: se aborta antes de parecer exitoso.
  const [rol] = await db.$queryRaw<{ ok: boolean }[]>`SELECT (rolbypassrls OR rolsuper) AS ok FROM pg_roles WHERE rolname = current_user`;
  if (!rol?.ok) throw new Error("El rol de la base no tiene BYPASSRLS: usa el rol propietario (DATABASE_URL_MIGRATE).");
  const tenant = await db.tenant.findFirst({ where: UUID.test(clave) ? { id: clave } : { slug: clave } });
  if (!tenant) throw new Error(`No existe el tenant "${clave}".`);
  const ruta = argumento("--respaldo") ?? `respaldo-cobertura-${tenant.slug}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const r = await sincronizarCobertura(db, {
    tenantId: tenant.id,
    aplicar,
    alAplicar: (parcial) => writeFileSync(ruta, JSON.stringify({ estado: "en_curso", ...parcial }, null, 2)),
  });
  if (aplicar) {
    writeFileSync(ruta, JSON.stringify({ estado: "aplicado", ...r }, null, 2));
    console.log(`Respaldo: ${ruta}`);
  }
  console.log(aplicar ? "== Cobertura sincronizada ==" : "== Simulación (usa --apply para escribir) ==");
  console.log(`Tenant: ${tenant.slug} (${tenant.id}) · hoy ${r.hoy} · puestos activos revisados: ${r.revisados}`);
  console.log(`Puestos ${aplicar ? "actualizados" : "por actualizar"}: ${r.cambios.length}`);
  for (const c of r.cambios) console.log(`  ${c.nombre}: ${c.antes.cobertura} → ${c.despues.cobertura}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

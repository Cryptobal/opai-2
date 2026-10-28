// Ejecución manual por Carlos en dev. Nunca se ejecuta como parte del despliegue.
// DATABASE_URL_MIGRATE=<propietario> pnpm --filter @opai/db exec tsx scripts/archivar-cargos.ts
//   --tenant <uuid> --dry-run   (obligatorio simular primero)
//   --tenant <uuid> --apply
// No imprime sueldos ni datos personales. Sin conversión ni borrado (D10).
// Reversión: solo si se requiere volver al código anterior, restaurar estado="vigente"
// en los IDs respaldados por el responsable antes de aplicar. No habilita escritura en la app.
import "dotenv/config";
import { cerrarClientes, dbAdmin } from "../src/index";
import { archivarCargos } from "./archivar-cargos-nucleo";

async function main() {
  const args = process.argv.slice(2);
  const tenantId = args[args.indexOf("--tenant") + 1];
  if (
    !args.includes("--tenant") ||
    !tenantId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)
  )
    throw new Error("Indica --tenant <uuid>.");
  const dryRun = args.includes("--dry-run");
  if (dryRun === args.includes("--apply")) throw new Error("Elige --dry-run o --apply.");
  const r = await archivarCargos(dbAdmin(), { tenantId, dryRun });
  console.log(JSON.stringify({ dryRun, ...r }));
}
main()
  .catch(() => {
    console.error(
      "No se completó el archivado. Revisa los argumentos y la conexión de mantenimiento.",
    );
    process.exitCode = 1;
  })
  .finally(cerrarClientes);

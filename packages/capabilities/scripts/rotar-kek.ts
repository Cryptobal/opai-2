// Rotación de la KEK de secretos (ADR-027): recifra la DEK de cada tenant con la KEK nueva. Los
// secretos no se tocan. Uso (rol propietario, nunca imprime claves):
//   OPAI_SECRETS_KEY=<nueva> OPAI_SECRETS_KEY_VERSION=<n+1> OPAI_SECRETS_KEY_ANTERIOR=<vigente> \
//   DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/capabilities rotar-kek
// Después: dejar OPAI_SECRETS_KEY y la versión nuevas en Vercel y quitar la anterior.
import { cerrarClientes, dbAdmin } from "@opai/db";
import { kekDelEntorno } from "@opai/integrations";

import { reenvolverDeks } from "./reenvolver-dek";

async function main(): Promise<void> {
  const k = kekDelEntorno();
  if (!k.actual || !k.anterior)
    throw new Error("Faltan OPAI_SECRETS_KEY y OPAI_SECRETS_KEY_ANTERIOR.");
  // Cada tenant se relee con `FOR UPDATE` en su transacción: no pisa una rotación de DEK (`rotar-dek`).
  const recifradas = await reenvolverDeks(dbAdmin(), {
    actual: k.actual,
    anterior: k.anterior,
    version: k.version,
  });
  console.log(`DEK recifradas con la KEK versión ${k.version}: ${recifradas}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

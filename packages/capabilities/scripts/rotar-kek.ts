// Rotación de la KEK de secretos (ADR-027): recifra la DEK de cada tenant con la KEK nueva. Los
// secretos no se tocan. Uso (rol propietario, nunca imprime claves):
//   OPAI_SECRETS_KEY=<nueva> OPAI_SECRETS_KEY_VERSION=<n+1> OPAI_SECRETS_KEY_ANTERIOR=<vigente> \
//   DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/capabilities rotar-kek
// Después: dejar OPAI_SECRETS_KEY y la versión nuevas en Vercel y quitar la anterior.
import { cerrarClientes, dbAdmin } from "@opai/db";
import { cifrar, descifrar, kekDelEntorno } from "@opai/integrations";

async function main(): Promise<void> {
  const k = kekDelEntorno();
  if (!k.actual || !k.anterior)
    throw new Error("Faltan OPAI_SECRETS_KEY y OPAI_SECRETS_KEY_ANTERIOR.");
  const db = dbAdmin();
  const filas = await db.claveTenant.findMany({ where: { kekVersion: { lt: k.version } } });
  let recifradas = 0;
  for (const f of filas) {
    const dek = descifrar(k.anterior, { cifrado: f.dekCifrada, iv: f.iv, tag: f.tag });
    const c = cifrar(k.actual, dek);
    await db.claveTenant.update({
      where: { id: f.id },
      data: {
        dekCifrada: Uint8Array.from(c.cifrado),
        iv: Uint8Array.from(c.iv),
        tag: Uint8Array.from(c.tag),
        kekVersion: k.version,
      },
    });
    recifradas += 1;
  }
  console.log(`DEK recifradas con la KEK versión ${k.version}: ${recifradas}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

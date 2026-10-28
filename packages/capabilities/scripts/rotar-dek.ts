// Rotación de la DEK de un tenant (ADR-027, Brief 07d §22): recifra sus secretos y campos sensibles
// con una DEK nueva y la reemplaza, en una transacción. Uso (rol de la app, nunca imprime claves):
//   OPAI_SECRETS_KEY=<vigente> OPAI_SECRETS_KEY_VERSION=<n> DATABASE_URL=<url opai_app> \
//   pnpm --filter @opai/capabilities rotar-dek <tenantId>
// Solo bajo instrucción de Carlos (p. ej. sospecha de exposición de la DEK); la KEK se rota con rotar-kek.
import { cerrarClientes } from "@opai/db";

import { crearContexto } from "../src";
import { rotarDek } from "../src/core/cumplimiento/rotar-dek";

async function main(): Promise<void> {
  const tenantId = process.argv[2];
  if (!tenantId) throw new Error("Indica el id del tenant.");
  const ctx = crearContexto({
    tenantId,
    actor: { tipo: "system" },
    rol: "owner",
    medidor: { registrar: async () => undefined },
  });
  const r = await rotarDek(ctx);
  console.log(
    `DEK rotada: ${r.secretos} secretos y ${r.campos} campos recifrados (${r.kidAnterior} → ${r.kidNuevo}).`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

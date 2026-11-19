import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { ejecutarComprasQaPreview } from "./compras-qa-preview-ejecutar";

// Sin dotenv: destino y contexto exclusivamente del paso CI revisado, nunca de un .env local.
async function main() {
  const evento = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? "", "utf8")) as unknown;
  await ejecutarComprasQaPreview(process.env, evento, {
    fetch,
    conectar: (url) => new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }),
  });
  console.log("Fixture sintética de compras verificada.");
}
void main().catch(() => {
  // No imprimir error bruto: un driver o HTTP podría incluir la URL o credenciales.
  console.error(
    "Setup de compras abortado: validar destino o integridad de fixture. Sin reparación automática.",
  );
  process.exitCode = 1;
});

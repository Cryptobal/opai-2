// Crea (idempotente) el usuario con platformRole "owner" de Carlos.
// Uso: DATABASE_URL_MIGRATE=<url propietario> SEED_OWNER_PASSWORD=<…> pnpm --filter @opai/auth seed:platform-owner
// La contraseña llega por entorno y nunca se imprime. Si el usuario ya existe, solo asegura el rol
// de plataforma y no toca su contraseña.
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";

import { cerrarClientes, dbAdmin } from "@opai/db";

import { LARGO_MINIMO_PASSWORD } from "../src/opciones";

async function main(): Promise<void> {
  const email = (process.env["SEED_OWNER_EMAIL"] ?? "carlos.irigoyen@opai.cl").toLowerCase();
  const nombre = process.env["SEED_OWNER_NAME"] ?? "Carlos Irigoyen";
  const password = process.env["SEED_OWNER_PASSWORD"];
  const db = dbAdmin();

  const existente = await db.user.findUnique({ where: { email } });
  if (existente) {
    await db.user.update({ where: { id: existente.id }, data: { platformRole: "owner" } });
    console.log(
      `Usuario ${email} ya existía: platformRole=owner asegurado; contraseña sin cambios.`,
    );
    return;
  }
  if (!password || password.length < LARGO_MINIMO_PASSWORD) {
    throw new Error(`Falta SEED_OWNER_PASSWORD (mínimo ${LARGO_MINIMO_PASSWORD} caracteres).`);
  }
  const hash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name: nombre, emailVerified: true, platformRole: "owner" },
    });
    await tx.account.create({
      data: { userId: user.id, providerId: "credential", accountId: user.id, password: hash },
    });
  });
  console.log(`Usuario ${email} creado con platformRole=owner.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

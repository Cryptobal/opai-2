// Enrola el segundo factor del usuario plataforma de los e2e con un secreto TOTP FIJO y conocido
// (NÚCLEO-F). Desde que el segundo factor es obligatorio para las cuentas de plataforma, los e2e que
// entran con ese usuario deben pasar el segundo paso; con un secreto fijo el test genera el TOTP.
// Solo desarrollo/CI y solo contra una base local. Corre encadenado a `@opai/db seed:e2e`, común a
// los jobs de e2e y rendimiento, ya con el owner creado por `seed:platform-owner`. Así ambos jobs
// entran por /mfa sin cambiar workflows. Standalone:
//   DATABASE_URL_MIGRATE=<url propietario local> pnpm --filter @opai/auth seed:e2e-mfa
//
// Acceso directo a la base (`dbAdmin()`, DATABASE_URL_MIGRATE) y SIN importar `../src/auth`: ese
// módulo construye `betterAuth(...)` al cargarse (necesita DATABASE_URL), y el paso del CI donde
// corre este seed («Migrar y sembrar la base») todavía no tiene esa variable (solo la propietaria;
// DATABASE_URL se exporta a `$GITHUB_ENV` recién para los pasos siguientes). `secretConfig`, sin
// `secret`/`secrets` configurados en `auth.ts` (no lo están), es literalmente `BETTER_AUTH_SECRET`.
import "dotenv/config";
import { hashPassword, symmetricEncrypt } from "better-auth/crypto";

import { cerrarClientes, dbAdmin } from "@opai/db";

// Secreto TOTP crudo FIJO del owner de e2e (solo pruebas). El mismo valor vive en
// `apps/web/e2e/sesion.ts`, que genera el código con él. No es un secreto real.
const E2E_MFA_SECRET_RAW = "opai-e2e-mfa-secreto-fijo-000000";

async function main(): Promise<void> {
  if (process.env["VERCEL_ENV"] === "production" || process.env["NODE_ENV"] === "production") {
    throw new Error("Solo para desarrollo y CI.");
  }
  const host = new URL(process.env["DATABASE_URL_MIGRATE"] ?? "postgresql://sin-configurar/")
    .hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`seed:e2e-mfa solo corre contra una base local (host recibido: ${host}).`);
  }
  const secretoApp = process.env["BETTER_AUTH_SECRET"] || process.env["AUTH_SECRET"];
  if (!secretoApp) throw new Error("Falta BETTER_AUTH_SECRET.");
  const email = (process.env["SEED_OWNER_EMAIL"] ?? "carlos.irigoyen@opai.cl").toLowerCase();
  const db = dbAdmin();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error("Primero corre seed:platform-owner.");
  // Mismo cifrado que usa el plugin (symmetricEncrypt con el secretConfig del servidor), para que el
  // código TOTP que genera el test valide contra el secreto guardado.
  const secret = await symmetricEncrypt({ key: secretoApp, data: E2E_MFA_SECRET_RAW });
  const backupCodes = await symmetricEncrypt({ key: secretoApp, data: JSON.stringify([]) });
  await db.twoFactor.upsert({
    where: { userId: user.id },
    update: { secret, backupCodes, verified: true },
    create: { userId: user.id, secret, backupCodes, verified: true },
  });
  await db.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  console.log(`${email} quedó con el segundo factor activo (secreto fijo de e2e).`);

  // Owner SIN segundo factor (CAR-286: ya no es obligatorio): owner de `gard`, con
  // contraseña (la misma que el owner, para el test) y sin MFA. Entra solo con contraseña.
  const password = process.env["SEED_OWNER_PASSWORD"];
  const tenant = await db.tenant.findUnique({ where: { slug: "gard" } });
  // `passkeys-e2e` es otro owner sin MFA, propio del e2e de passkeys (no choca con el de MFA).
  if (password && tenant) {
    const correos = [
      { email: "mfa-pendiente-e2e@opai.cl", nombre: "MFA Pendiente" },
      { email: "passkeys-e2e@opai.cl", nombre: "Passkeys E2E" },
    ];
    for (const { email: correoPend, nombre } of correos) {
      const pend =
        (await db.user.findUnique({ where: { email: correoPend } })) ??
        (await db.user.create({ data: { name: nombre, email: correoPend, emailVerified: true } }));
      const hash = await hashPassword(password);
      const cuenta = await db.account.findFirst({
        where: { userId: pend.id, providerId: "credential" },
      });
      if (cuenta) await db.account.update({ where: { id: cuenta.id }, data: { password: hash } });
      else
        await db.account.create({
          data: { userId: pend.id, providerId: "credential", accountId: pend.id, password: hash },
        });
      await db.membership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: pend.id } },
        update: { rol: "owner", portales: ["erp"], estado: "activa" },
        create: {
          tenantId: tenant.id,
          userId: pend.id,
          rol: "owner",
          portales: ["erp"],
          estado: "activa",
        },
      });
      await db.user.update({ where: { id: pend.id }, data: { twoFactorEnabled: false } });
      await db.twoFactor.deleteMany({ where: { userId: pend.id } });
      console.log(`${correoPend} es owner de gard SIN segundo factor (entra solo con contraseña).`);
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

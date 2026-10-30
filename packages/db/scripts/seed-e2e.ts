// Pertenencia del usuario plataforma al tenant `gard` (owner, todos los portales) para los e2e de CI.
// Además, una segunda empresa («Empresa E2E», con una persona propia) y un usuario con acceso a las
// dos (`e2e-multiempresa@opai.cl`, si existe) para el e2e de caché entre empresas.
// Uso: DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db seed:e2e
// Corre después de seed:dev-tenant y seed:platform-owner. Idempotente. No toca contraseñas.
import "dotenv/config";

import { digitoVerificador } from "@opai/domain";

import { cerrarClientes, dbAdmin } from "../src/index";

async function main(): Promise<void> {
  if (process.env["VERCEL_ENV"] === "production" || process.env["NODE_ENV"] === "production") {
    throw new Error("Solo para desarrollo y CI.");
  }
  // Solo contra una base local (Postgres de servicio de CI o de desarrollo), nunca contra Neon.
  const host = new URL(process.env["DATABASE_URL_MIGRATE"] ?? "postgresql://sin-configurar/")
    .hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`seed:e2e solo corre contra una base local (host recibido: ${host}).`);
  }
  const email = (process.env["SEED_OWNER_EMAIL"] ?? "carlos.irigoyen@opai.cl").toLowerCase();
  const db = dbAdmin();
  const tenant = await db.tenant.findUnique({ where: { slug: "gard" } });
  const user = await db.user.findUnique({ where: { email } });
  if (!tenant || !user) throw new Error("Primero corre seed:dev-tenant y seed:platform-owner.");
  const portales = ["erp", "supervisor", "trabajador", "terreno", "cliente"];
  await db.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: { rol: "owner", portales, estado: "activa" },
    create: { tenantId: tenant.id, userId: user.id, rol: "owner", portales, estado: "activa" },
  });
  console.log(`${email} es owner de ${tenant.slug} con todos los portales.`);

  const otra = await db.tenant.upsert({
    where: { slug: "otra-e2e" },
    update: {},
    create: { slug: "otra-e2e", nombre: "Empresa E2E", vertical: "seguridad" },
  });
  if (!(await db.persona.findFirst({ where: { tenantId: otra.id } }))) {
    await db.persona.create({
      data: {
        tenantId: otra.id,
        nombres: "Zoe",
        apellidos: "Otraempresa",
        rut: `31000000-${digitoVerificador("31000000")}`,
      },
    });
  }
  // Usuario dedicado al e2e de bloqueo de login (B1): sin contraseña ni membresía, solo recibe
  // intentos fallidos. Bloquearlo por fuerza bruta no afecta a los demás specs, que no lo usan.
  await db.user.upsert({
    where: { email: "bloqueo-e2e@opai.cl" },
    update: {},
    create: { name: "Bloqueo E2E", email: "bloqueo-e2e@opai.cl" },
  });
  console.log("bloqueo-e2e@opai.cl listo para el e2e de bloqueo de login.");

  // Teammate con MFA activo para el e2e de «Restablecer MFA» en Configuración · Usuarios (CAR-54):
  // ni platformRole ni en otra empresa, para que el owner de gard pueda restablecerle el segundo
  // factor. No inicia sesión en los e2e: el secreto guardado no se usa para nada más.
  const RESTABLECER_MFA_EMAIL = "mfa-restablecer-e2e@opai.cl";
  const conMfa = await db.user.upsert({
    where: { email: RESTABLECER_MFA_EMAIL },
    update: { twoFactorEnabled: true },
    create: {
      name: "Restablecer MFA E2E",
      email: RESTABLECER_MFA_EMAIL,
      emailVerified: true,
      twoFactorEnabled: true,
    },
  });
  await db.twoFactor.upsert({
    where: { userId: conMfa.id },
    update: {},
    create: { userId: conMfa.id, secret: "sin-uso-e2e", backupCodes: "sin-uso-e2e" },
  });
  await db.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: conMfa.id } },
    update: { rol: "viewer", portales: ["erp"], estado: "activa" },
    create: { tenantId: tenant.id, userId: conMfa.id, rol: "viewer", portales: ["erp"], estado: "activa" },
  });
  console.log(`${RESTABLECER_MFA_EMAIL} es viewer de ${tenant.slug} con MFA activo (e2e CAR-54).`);

  const multi = await db.user.findUnique({ where: { email: "e2e-multiempresa@opai.cl" } });
  if (multi) {
    for (const t of [tenant, otra]) {
      await db.membership.upsert({
        where: { tenantId_userId: { tenantId: t.id, userId: multi.id } },
        update: { rol: "owner", portales, estado: "activa" },
        create: { tenantId: t.id, userId: multi.id, rol: "owner", portales, estado: "activa" },
      });
    }
    console.log(`e2e-multiempresa@opai.cl es owner de ${tenant.slug} y ${otra.slug}.`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

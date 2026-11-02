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

  const qaEmail = "portal-qa-trabajador@opai.cl";
  const qaUser = await db.user.upsert({
    where: { email: qaEmail },
    update: { name: "TEST QA" },
    create: { name: "TEST QA", email: qaEmail },
  });
  await db.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: qaUser.id } },
    update: { rol: "viewer", portales: ["trabajador"], estado: "activa" },
    create: { tenantId: tenant.id, userId: qaUser.id, rol: "viewer", portales: ["trabajador"], estado: "activa" },
  });
  const rutQa = `99000000-${digitoVerificador("99000000")}`;
  const personaQa = await db.persona.findFirst({ where: { tenantId: tenant.id, usuarioId: qaUser.id } });
  if (!personaQa) {
    await db.persona.create({
      data: {
        tenantId: tenant.id,
        usuarioId: qaUser.id,
        nombres: "TEST",
        apellidos: "QA",
        rut: rutQa,
        emailLaboral: qaEmail,
      },
    });
  }
  console.log(`${qaEmail} es trabajador de prueba (ficha TEST QA, RUT ficticio ${rutQa}).`);

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

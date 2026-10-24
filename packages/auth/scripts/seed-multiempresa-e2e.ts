// Usuario de prueba CORRIENTE (sin platformRole, rol «admin») con dos empresas, Gard y Atlas, y los
// portales ERP y Supervisor, para el e2e del selector de portal y empresa del riel de iPad
// (apps/web/e2e/selector-riel.spec.ts). Atlas lleva una cuenta propia («Cliente Atlas E2E») para
// comprobar que al cambiar de empresa los datos de Gard desaparecen. Es un usuario aparte del de
// Carlos: con dos empresas el login pasa por «Elegir empresa». Idempotente.
// Solo contra una base local (Postgres de servicio de CI o de desarrollo), nunca contra Neon.
// Uso: DATABASE_URL_MIGRATE=<url local> SEED_OWNER_PASSWORD=<…> pnpm --filter @opai/auth seed:multiempresa-e2e
// Corre después de seed:dev-tenant. La contraseña llega por entorno y nunca se imprime.
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";

import { cerrarClientes, dbAdmin, sembrarCatalogo } from "@opai/db";
import { digitoVerificador } from "@opai/domain";

import { LARGO_MINIMO_PASSWORD } from "../src/opciones";

const CORREO = "e2e-selector@opai.cl";
const CUENTA_ATLAS = "Cliente Atlas E2E";

/** Valida el destino ANTES de cualquier escritura: solo desarrollo o CI, y solo base local. */
function exigirBaseLocal(): void {
  if (process.env["VERCEL_ENV"] === "production" || process.env["NODE_ENV"] === "production") {
    throw new Error("Solo para desarrollo y CI.");
  }
  const host = new URL(process.env["DATABASE_URL_MIGRATE"] ?? "postgresql://sin-configurar/")
    .hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(
      `seed:multiempresa-e2e solo corre contra una base local (host recibido: ${host}).`,
    );
  }
}

async function main(): Promise<void> {
  exigirBaseLocal();
  const password = process.env["SEED_OWNER_PASSWORD"];
  const db = dbAdmin();
  const gard = await db.tenant.findUnique({ where: { slug: "gard" } });
  if (!gard) throw new Error("Primero corre seed:dev-tenant.");

  let usuario = await db.user.findUnique({ where: { email: CORREO } });
  if (!usuario) {
    if (!password || password.length < LARGO_MINIMO_PASSWORD) {
      throw new Error(`Falta SEED_OWNER_PASSWORD (mínimo ${LARGO_MINIMO_PASSWORD} caracteres).`);
    }
    const hash = await hashPassword(password);
    usuario = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: CORREO, name: "Usuario e2e selector", emailVerified: true },
      });
      await tx.account.create({
        data: { userId: user.id, providerId: "credential", accountId: user.id, password: hash },
      });
      return user;
    });
  }

  const atlas = await db.tenant.upsert({
    where: { slug: "atlas" },
    update: {},
    create: { slug: "atlas", nombre: "Atlas Seguridad SpA", vertical: "seguridad" },
  });
  await sembrarCatalogo(db.$extends({}), atlas.id, atlas.vertical);
  if (!(await db.cuenta.count({ where: { tenantId: atlas.id, nombre: CUENTA_ATLAS } }))) {
    const cuerpo = "76123456";
    await db.cuenta.create({
      data: {
        tenantId: atlas.id,
        nombre: CUENTA_ATLAS,
        razonSocial: CUENTA_ATLAS,
        rut: `${cuerpo}-${digitoVerificador(cuerpo)}`,
        giro: "Servicios de prueba",
        estado: "cliente_activo",
        clienteDesde: new Date("2024-03-01T00:00:00.000Z"),
        region: "Región Metropolitana",
      },
    });
  }
  for (const tenantId of [gard.id, atlas.id]) {
    await db.membership.upsert({
      where: { tenantId_userId: { tenantId, userId: usuario.id } },
      update: { rol: "admin", portales: ["erp", "supervisor"], estado: "activa" },
      create: { tenantId, userId: usuario.id, rol: "admin", portales: ["erp", "supervisor"] },
    });
  }
  console.log(
    `${CORREO}: admin en gard y atlas, portales erp y supervisor (sin rol de plataforma).`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

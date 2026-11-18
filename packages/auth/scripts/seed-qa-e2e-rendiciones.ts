// Usuarios ficticios gerente y supervisor/aprobador de rendiciones en la empresa `qa-e2e` (preview-e2e).
// Idempotente; solo corre en rama Neon `preview/pr-N` y con `--tenant qa-e2e`. Sin contraseñas en código.
// Uso (CI preview): PREVIEW_RAMA=preview/pr-N DATABASE_URL_MIGRATE=<owner> \
//   QA_GERENTE_PASSWORD=<secreto> QA_SUPERVISOR_PASSWORD=<secreto> \
//   pnpm --filter @opai/auth seed:qa-e2e-rendiciones --tenant qa-e2e --confirmar
import "dotenv/config";

import { hashPassword } from "better-auth/crypto";

import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";
import { exigirRamaPreview, exigirTenantQaE2e } from "@opai/domain";

import { LARGO_MINIMO_PASSWORD } from "../src/opciones";
import { usuarioE2E } from "./usuario-e2e";

const CORREOS = {
  gerente: () => (process.env.E2E_QA_GERENTE_EMAIL ?? "r3-gerente@opai.cl").toLowerCase(),
  aprobador: () => (process.env.E2E_QA_APROBADOR_EMAIL ?? "r3-aprobador@opai.cl").toLowerCase(),
} as const;

function destino(argv: string[], env: NodeJS.ProcessEnv) {
  exigirRamaPreview(env["PREVIEW_RAMA"] ?? "");
  if (env["VERCEL_ENV"] === "production" || env["NODE_ENV"] === "production") {
    throw new Error("No corre en producción.");
  }
  const i = argv.indexOf("--tenant");
  const slug = i >= 0 ? argv[i + 1] : undefined;
  if (!slug) throw new Error("Indica --tenant qa-e2e.");
  exigirTenantQaE2e(slug);
  if (!env["DATABASE_URL_MIGRATE"]) throw new Error("Falta DATABASE_URL_MIGRATE.");
  const clave = (rol: "gerente" | "aprobador") => {
    const v = env[rol === "gerente" ? "QA_GERENTE_PASSWORD" : "QA_SUPERVISOR_PASSWORD"];
    const fallback = env["E2E_PASSWORD"];
    const p = v ?? fallback;
    if (!p || p.length < LARGO_MINIMO_PASSWORD) throw new Error(`Falta contraseña para ${rol} en secretos de CI.`);
    return p;
  };
  return { slug, confirmar: argv.includes("--confirmar"), claveGerente: clave("gerente"), claveAprobador: clave("aprobador") };
}

async function main(): Promise<void> {
  const { slug, confirmar, claveGerente, claveAprobador } = destino(process.argv.slice(2), process.env);
  const db = dbAdmin();
  const tenant = await db.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) throw new Error(`No existe la empresa «${slug}».`);
  const m = await db.tenantModule.findFirst({ where: { tenantId: tenant.id, moduloId: "rendiciones" } });
  if (!m) await db.tenantModule.create({ data: { tenantId: tenant.id, moduloId: "rendiciones", estado: "activo" } });
  if (!confirmar) {
    console.log(`Simulación en «${slug}»: gerente y aprobador de rendiciones (QA). Repite con --confirmar.`);
    return;
  }
  const gerente = await usuarioE2E(CORREOS.gerente(), "Gerente QA Rendiciones", await hashPassword(claveGerente));
  const aprobador = await usuarioE2E(CORREOS.aprobador(), "Supervisor QA Rendiciones", await hashPassword(claveAprobador));
  await enTransaccion(tenant.id, async (tx) => {
    const rol = await tx.rol.upsert({
      where: { tenantId_nombre: { tenantId: tenant.id, nombre: "Aprobador rendiciones QA" } },
      update: { permisos: ["rendiciones:aprobar", "rendiciones:rendir"] },
      create: {
        tenantId: tenant.id,
        nombre: "Aprobador rendiciones QA",
        permisos: ["rendiciones:aprobar", "rendiciones:rendir"],
      },
    });
    await tx.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: gerente.id } },
      update: { rol: "gerente", roleId: null, portales: ["erp"], estado: "activa" },
      create: { tenantId: tenant.id, userId: gerente.id, rol: "gerente", portales: ["erp"] },
    });
    await tx.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: aprobador.id } },
      update: { rol: "supervisor", roleId: rol.id, portales: ["erp", "supervisor"], estado: "activa" },
      create: {
        tenantId: tenant.id,
        userId: aprobador.id,
        rol: "supervisor",
        roleId: rol.id,
        portales: ["erp", "supervisor"],
      },
    });
  });
  console.log(`Listo en «${slug}»: usuarios de rendiciones QA sin imprimir contraseñas.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
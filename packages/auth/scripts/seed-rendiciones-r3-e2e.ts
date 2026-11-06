// Fixture local del e2e de Rendiciones R3 (CAR-208): bandeja del aprobador y lotes de pago.
// Solo empresas de QA (qa-rendiciones-r3 y qa-rendiciones-r3-b) con personas ficticias; nunca Gard, Neon
// ni producción (exigirBaseE2E). Idempotente: borra y vuelve a crear las rendiciones de prueba.
// La empresa B no define aprobador ni elegibles (caso «empresa sin aprobador»).
import { hashPassword } from "better-auth/crypto";
import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";
import { exigirBaseE2E } from "../../db/scripts/exigir-base-e2e";
import { usuarioE2E } from "./usuario-e2e";

const A = "qa-rendiciones-r3";
const B = "qa-rendiciones-r3-b";
const PERSONAS = {
  supervisor: ["r3-supervisor@opai.cl", "Sofía Supervisora (QA)"],
  aprobador: ["r3-aprobador@opai.cl", "Ana Aprobadora (QA)"],
  gerente: ["r3-gerente@opai.cl", "Gabriel Gerente (QA)"],
  gerente2: ["r3-gerente2@opai.cl", "Greta Gerente (QA)"],
  viewer: ["r3-viewer@opai.cl", "Vera Viewer (QA)"],
  sinAprobador: ["r3-sin-aprobador@opai.cl", "Samuel Sin Aprobador (QA)"],
} as const;

async function empresa(slug: string, nombre: string) {
  const db = dbAdmin();
  const t = await db.tenant.upsert({ where: { slug }, update: {}, create: { slug, nombre, vertical: "seguridad" } });
  const m = await db.tenantModule.findFirst({ where: { tenantId: t.id, moduloId: "rendiciones" } });
  if (!m) await db.tenantModule.create({ data: { tenantId: t.id, moduloId: "rendiciones", estado: "activo" } });
  return t.id;
}

async function main() {
  exigirBaseE2E();
  const password = process.env["E2E_PASSWORD"] ?? process.env["SEED_OWNER_PASSWORD"];
  if (!password) throw new Error("Falta E2E_PASSWORD");
  const hash = await hashPassword(password);
  const ta = await empresa(A, "Empresa QA Rendiciones R3");
  const tb = await empresa(B, "Empresa QA Rendiciones R3 B");
  const u = Object.fromEntries(
    await Promise.all(Object.entries(PERSONAS).map(async ([k, [email, nombre]]) => [k, (await usuarioE2E(email, nombre, hash)).id] as const)),
  ) as Record<keyof typeof PERSONAS, string>;

  await enTransaccion(ta, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70138)`;
    const rol = await tx.rol.upsert({
      where: { tenantId_nombre: { tenantId: ta, nombre: "Aprobador de rendiciones (QA)" } },
      update: { permisos: ["rendiciones:aprobar", "rendiciones:rendir"] },
      create: { tenantId: ta, nombre: "Aprobador de rendiciones (QA)", permisos: ["rendiciones:aprobar", "rendiciones:rendir"] },
    });
    const miembros: [keyof typeof PERSONAS, string, string[], string | null][] = [
      ["supervisor", "supervisor", ["supervisor"], null], ["aprobador", "viewer", ["erp"], rol.id],
      ["gerente", "gerente", ["erp"], null], ["gerente2", "gerente", ["erp"], null], ["viewer", "viewer", ["erp"], null],
    ];
    for (const [k, rolBase, portales, roleId] of miembros)
      await tx.membership.upsert({
        where: { tenantId_userId: { tenantId: ta, userId: u[k] } },
        update: { rol: rolBase, roleId, portales, estado: "activa" },
        create: { tenantId: ta, userId: u[k], rol: rolBase, roleId, portales },
      });
    await tx.rendicion.deleteMany({ where: { codigo: { in: [910001, 910002, 910003] } } });
    const crear = (codigo: number, estado: string, monto: number, descripcion: string, aprobada: boolean) =>
      tx.rendicion.create({
        data: {
          tenantId: ta, codigo, tipo: "compra", estado, solicitanteId: u.supervisor, aprobadorId: u.aprobador, centroCosto: "administracion",
          descripcion, montoTotal: monto, enviadaEn: new Date(), ...(aprobada ? { decididaEn: new Date(), decididaPorId: u.aprobador } : {}),
          items: { create: [{ tenantId: ta, fecha: new Date("2026-11-02T00:00:00Z"), proveedor: "Ferretería ficticia", folio: `QA-${codigo}`, descripcion: "Insumos de prueba", monto, sinRespaldoMotivo: "Dato de prueba", orden: 0 }] },
        },
      });
    await crear(910001, "enviada", 12_500, "Compra de candados (QA)", false);
    await crear(910002, "enviada", 7_490, "Taxi a instalación (QA)", false);
    await crear(910003, "aprobada", 18_000, "Colación de turno (QA)", true);
  });

  await enTransaccion(tb, async (tx) => {
    await tx.membership.upsert({
      where: { tenantId_userId: { tenantId: tb, userId: u.sinAprobador } },
      update: { rol: "gerente", roleId: null, portales: ["erp"], estado: "activa" },
      create: { tenantId: tb, userId: u.sinAprobador, rol: "gerente", portales: ["erp"] },
    });
  });
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Error de fixture");
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

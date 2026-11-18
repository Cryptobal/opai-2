// En ramas Neon `preview/pr-N`, desactiva empresas que no son `qa-*`: suspende, quita membresías y keys.
// Gard y el resto dejan de estar accesibles en la vista previa (los datos siguen en la rama, sin membresía activa).
// Falla cerrado si la verificación no puede correr o si queda alguna membresía activa en empresa no QA.
import "dotenv/config";

import { exigirRamaPreview, esSlugEmpresaQa, SLUG_EMPRESA_QA_E2E } from "@opai/domain";

import { cerrarClientes, dbAdmin } from "../src/index";

async function main(): Promise<void> {
  exigirRamaPreview(process.env["PREVIEW_RAMA"] ?? "");
  if (!process.env["DATABASE_URL_MIGRATE"]) throw new Error("Falta DATABASE_URL_MIGRATE.");
  const db = dbAdmin();
  const empresas = await db.tenant.findMany({ select: { id: true, slug: true } });
  if (!empresas.some((t) => t.slug === SLUG_EMPRESA_QA_E2E)) {
    throw new Error(`La rama de preview no tiene la empresa ficticia «${SLUG_EMPRESA_QA_E2E}».`);
  }
  const ajenas = empresas.filter((t) => !esSlugEmpresaQa(t.slug));
  for (const t of ajenas) {
    await db.membership.deleteMany({ where: { tenantId: t.id } });
    await db.apiKey.deleteMany({ where: { tenantId: t.id } });
    await db.tenant.update({ where: { id: t.id }, data: { estado: "suspendido" } });
    console.log(`Empresa no QA deshabilitada en preview: ${t.slug}`);
  }
  const [{ n }] = await db.$queryRaw<[{ n: bigint }]>`
    SELECT COUNT(*)::bigint AS n
    FROM core.memberships m
    INNER JOIN core.tenants t ON t.id = m.tenant_id
    WHERE m.estado = 'activa' AND t.slug !~ '^qa-[a-z0-9-]+$'`;
  if (Number(n) > 0) {
    throw new Error("Quedaron membresías activas en empresas que no son de QA.");
  }
  console.log(
    ajenas.length
      ? `Verificación OK: ${ajenas.length} empresa(s) no QA sin acceso activo.`
      : "Verificación OK: solo empresas qa-* con membresías activas.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
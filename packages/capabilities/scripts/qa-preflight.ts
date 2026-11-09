// Preflight de SOLO LECTURA del QA aislado de Finanzas (CAR-221): confirma, antes de cualquier migración o siembra, que
// el destino es el proyecto de QA vacío (`opai2_qa`) o ya sembrado solo con empresas `qa-*`, y que nunca es Gard, main
// ni una copia con datos. No escribe nada, no imprime URLs ni claves. Sale con código 1 ante la menor duda.
//
// Uso (las URLs llegan por entorno desde el canal seguro; antes de migrar basta una URL con el nombre de rol y base):
//   OPAI_ENTORNO=qa-aislado OPAI_QA_DESTINO=opai2-qa-aislado SII_ADAPTADOR=simulado CESION_ADAPTADOR=simulado \
//   DATABASE_URL=<opai_app> DATABASE_URL_MIGRATE=<propietario> pnpm --filter @opai/capabilities qa:preflight
import { cerrarClientes, dbAdmin } from "@opai/db";
import { diagnosticoBaseQa, problemasDestinoQa } from "@opai/domain";

async function main(): Promise<void> {
  const envProblemas = problemasDestinoQa(process.env);
  if (envProblemas.length > 0) {
    console.error(`Destino no autorizado para el QA aislado:\n- ${envProblemas.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  const db = dbAdmin();
  const [actual] = await db.$queryRaw<{ base: string }[]>`SELECT current_database() AS base`;
  const esquemas = await db.$queryRaw<{ nombre: string }[]>`
    SELECT schema_name AS nombre FROM information_schema.schemata
    WHERE schema_name NOT LIKE 'pg\_%' AND schema_name NOT IN ('information_schema', 'public')`;
  const [nucleo] = await db.$queryRaw<{ existe: boolean }[]>`SELECT to_regclass('core.tenants') IS NOT NULL AS existe`;
  const slugs = nucleo?.existe ? (await db.tenant.findMany({ select: { slug: true } })).map((t) => t.slug) : null;
  const d = diagnosticoBaseQa({ baseActual: actual?.base ?? "", esquemas: esquemas.map((e) => e.nombre), slugs });
  if (d.problemas.length > 0) {
    console.error(`Preflight del QA aislado: ${d.estado}.\n- ${d.problemas.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    d.estado === "vacia"
      ? "Preflight OK: la base es la del QA aislado y está vacía (sin esquemas). Se puede migrar."
      : `Preflight OK: la base es la del QA aislado y solo tiene empresas qa-* (${slugs?.length ?? 0}).`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

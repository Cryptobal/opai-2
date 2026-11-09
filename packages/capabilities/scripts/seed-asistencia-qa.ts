// Casos sintéticos de Asistencia · Face ID SOLO para desarrollo/preview, en un tenant propio `qa-*` (nunca el real).
// Proveedor biométrico SIMULADO: sin rostros reales, sin AWS, sin datos de Gard. Simula por defecto; escribe con
// `--confirmar`. Uso: OPAI_ENTORNO=dev DATABASE_URL=<opai_app> DATABASE_URL_MIGRATE=<propietario de dev> \
//   OPAI_SECRETS_KEY=<clave dev> pnpm --filter @opai/capabilities seed:asistencia-qa --tenant qa-asistencia [--confirmar]
import { cerrarClientes, dbAdmin } from "@opai/db";

import { capacidadesDelNucleo, capacidadesPauta, limpiarModulos, limpiarRegistro, registrarCapacidades, registrarModulos } from "../src";
import { manifest } from "../../../modules/asistencia/manifest";
import { CASOS_QA } from "./asistencia-qa-casos";
import { sembrarCasos } from "./asistencia-qa-sembrar";
import { leerDestino } from "./seed-finanzas-qa-guardas";

async function main(): Promise<void> {
  const { slug, confirmar } = leerDestino(process.argv.slice(2), process.env);
  const admin = dbAdmin();
  const existente = await admin.tenant.findUnique({ where: { slug } });
  if (existente && (await admin.persona.count({ where: { tenantId: existente.id, nombres: { startsWith: "QA Caso" } } })))
    throw new Error(`«${slug}» ya tiene los casos sintéticos: usa otro tenant qa-… (no se duplican).`);
  if (!confirmar) {
    console.log(`Simulación en «${slug}»: ${existente ? "tenant existente" : "se crearía el tenant"}; ${CASOS_QA.length} casos (${CASOS_QA.map((c) => c.id).join(", ")}). Repite con --confirmar.`);
    return;
  }
  const tenant = existente ?? (await admin.tenant.create({ data: { slug, nombre: "QA Asistencia (ficticio)", vertical: "seguridad" } }));
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesPauta]);
  registrarModulos([manifest]);
  const r = await sembrarCasos(admin, tenant.id);
  console.log(`Listo en «${slug}»: instalación ${r.instalacionId}; ${r.casos.length} casos. Ver docs/2.0/qa/asistencia-face-id/manifiesto.md.`);
}

main()
  .catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => cerrarClientes());

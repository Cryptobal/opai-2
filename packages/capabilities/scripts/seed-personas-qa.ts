// Datos de QA de Personas y Anexos SOLO para desarrollo/preview, en un tenant propio de QA (slug `qa-*`,
// nunca el real ni datos de Gard): validar CAR-210 («Revisar» abre el anexo concreto) y la ficha de CAR-124.
// Todo ficticio (RUT sintéticos 31000xxx, nombres "QA"); idempotente. Mismas guardas que el seed de Finanzas
// (seed-finanzas-qa-guardas.ts): OPAI_ENTORNO=dev, tenant `qa-*` explícito, ambas URLs a la misma base,
// simula por defecto y escribe con `--confirmar`.
// Estados de persona que existen hoy en el código: activa, inactiva y bloqueada. «Postulante» y «Externo»
// (modelo de CAR-96) aún no están en el esquema: este seed NO los inventa.
// Uso: OPAI_ENTORNO=dev DATABASE_URL=<opai_app> DATABASE_URL_MIGRATE=<propietario de dev> \
//      pnpm --filter @opai/capabilities seed:personas-qa --tenant qa-personas [--confirmar]
import { randomUUID } from "node:crypto";

import { cerrarClientes, dbAdmin, enTransaccion } from "@opai/db";
import { digitoVerificador } from "@opai/domain";

import { capacidadesDelNucleo, crearContexto, executeCapability, registrarCapacidades } from "../src";
import { leerDestino } from "./seed-finanzas-qa-guardas";

const rutQa = (base: string) => `${base}-${digitoVerificador(base)}`;
const PERSONAS = [
  { rut: rutQa("31000101"), nombres: "Ana", apellidos: "QA Activa", estado: "activa", anexo: true },
  { rut: rutQa("31000102"), nombres: "Bruno", apellidos: "QA Activo", estado: "activa", anexo: true },
  { rut: rutQa("31000103"), nombres: "Carla", apellidos: "QA Inactiva", estado: "inactiva", anexo: false },
] as const;

async function main(): Promise<void> {
  const { slug, confirmar } = leerDestino(process.argv.slice(2), process.env);
  const admin = dbAdmin();
  const existente = await admin.tenant.findUnique({ where: { slug } });
  if (!confirmar) {
    console.log(
      `Simulación en «${slug}»: ${existente ? "tenant existente" : "se crearía el tenant de QA"}; cargo QA, 2 personas activas con vínculo vigente y un anexo en borrador cada una (el de Ana es el más antiguo), y 1 inactiva con vínculo terminado. Repite con --confirmar para aplicar.`,
    );
    return;
  }
  const tenant =
    existente ?? (await admin.tenant.create({ data: { slug, nombre: "QA Personas (ficticio)", vertical: "seguridad" } }));
  const tenantId = tenant.id;

  const ids = await enTransaccion(tenantId, async (db) => {
    const cargo =
      (await db.cargo.findFirst({ where: { tenantId, nombre: "Guardia QA" } })) ??
      (await db.cargo.create({ data: { tenantId, nombre: "Guardia QA" } }));
    const salida: { id: string; anexo: boolean; nombre: string }[] = [];
    for (const p of PERSONAS) {
      let persona = await db.persona.findFirst({ where: { tenantId, rut: p.rut } });
      if (!persona) {
        persona = await db.persona.create({
          data: { tenantId, nombres: p.nombres, apellidos: p.apellidos, rut: p.rut, estado: p.estado },
        });
        await db.vinculoLaboral.create({
          data: {
            tenantId,
            personaId: persona.id,
            cargoId: cargo.id,
            tipo: "indefinido",
            inicio: new Date("2026-01-05"),
            ...(p.estado === "inactiva" ? { estado: "terminado", termino: new Date("2026-09-30") } : {}),
          },
        });
      }
      salida.push({ id: persona.id, anexo: p.anexo, nombre: `${p.nombres} ${p.apellidos}` });
    }
    return salida;
  });

  registrarCapacidades([...capacidadesDelNucleo]);
  const usuarioId = randomUUID();
  const ctx = crearContexto({
    tenantId,
    actor: { tipo: "user", id: usuarioId },
    usuario: { id: usuarioId, nombre: "Seed QA", email: "seed-qa@opai.test", platformRole: null },
    portal: "erp",
    portalesMembresia: ["erp"],
    rol: "owner",
    modulosActivos: [],
    medidor: { registrar: async () => undefined },
  });
  // Los borradores se crean en orden: el primero (Ana) es el más antiguo, el que abre «Revisar».
  for (const p of ids.filter((x) => x.anexo)) {
    if (await admin.anexoContrato.count({ where: { tenantId, personaId: p.id, estado: "borrador" } })) continue;
    const r = await executeCapability(ctx, "core.anexos.generar", {
      personaId: p.id,
      motivoCambio: "rol",
      snapshotAntes: { rol: "Guardia QA" },
      snapshotDespues: { rol: "Supervisor QA" },
    });
    if (!r.ok) throw new Error(`core.anexos.generar: ${r.error.code} ${r.error.message}`);
  }
  const primero = await admin.anexoContrato.findFirst({
    where: { tenantId, estado: "borrador" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, personaId: true },
  });
  console.log(`Datos de QA de Personas listos en «${slug}».`);
  console.log("Rutas a validar (con un usuario owner/admin del tenant):");
  console.log("  /  → tarjeta «anexos de contrato en borrador» → «Revisar»");
  if (primero) console.log(`  /personas/${primero.personaId}/anexos/${primero.id}  (destino esperado de «Revisar»)`);
  for (const p of ids) console.log(`  /personas/${p.id}  ·  ${p.nombre}  (laboral, anexos, pago)`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

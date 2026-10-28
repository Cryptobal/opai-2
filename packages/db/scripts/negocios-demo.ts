// Negocios ficticios del tablero de Comercial (Brief 07 · PR 1b) para el tenant `gard` de desarrollo,
// e2e y QA. Sobre las cuentas e instalaciones de datos-demo.ts; nunca datos reales. Idempotente.
import type { dbAdmin } from "../src/index";

type Db = ReturnType<typeof dbAdmin>;

// [título, cuenta, etapa (orden en el embudo base), monto mensual, cierre, instalación]
const NEGOCIOS = [
  ["Guardias 24/7 · Planta Quilicura", "Logística Andina SpA", 0, null, null, null],
  ["Rondas nocturnas · CD Pudahuel", "Logística Andina SpA", 1, 3_200_000, null, "CD Pudahuel"],
  [
    "Conserjería · Torre Costanera",
    "Inmobiliaria Costanera Ltda.",
    2,
    4_800_000,
    null,
    "Torre Costanera Oriente",
  ],
  [
    "Seguridad de faena · Cerro Alto",
    "Minera Cerro Alto SpA",
    3,
    14_250_000,
    "2026-12-15",
    "Faena Cerro Alto",
  ],
  [
    "Ampliación de dotación · Quilicura",
    "Logística Andina SpA",
    4,
    2_200_000,
    "2026-11-30",
    "Planta Quilicura",
  ],
] as const;

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** Siembra los negocios demo del tenant si aún no existen (requiere el catálogo de Comercial). */
export async function sembrarNegociosDemo(db: Db, tenantId: string): Promise<void> {
  const primero = NEGOCIOS[0][0];
  if (await db.negocio.count({ where: { tenantId, titulo: primero } })) return;
  const embudo = await db.embudo.findFirst({ where: { tenantId, porDefecto: true } });
  if (!embudo) throw new Error("Falta el embudo de Comercial (corre seed:dev-tenant).");
  const etapas = await db.etapa.findMany({ where: { embudoId: embudo.id } });
  const [cuentas, instalaciones] = await Promise.all([
    db.cuenta.findMany({ where: { tenantId }, select: { id: true, nombre: true } }),
    db.instalacion.findMany({ where: { tenantId }, select: { id: true, nombre: true } }),
  ]);
  for (const [titulo, cuenta, orden, monto, cierre, instalacion] of NEGOCIOS) {
    const etapa = etapas.find((e) => e.orden === orden);
    const cuentaId = cuentas.find((c) => c.nombre === cuenta)?.id;
    if (!etapa || !cuentaId) continue;
    const n = await db.negocio.create({
      data: {
        tenantId,
        titulo,
        cuentaId,
        embudoId: embudo.id,
        etapaId: etapa.id,
        estado: "abierto",
        probabilidad: etapa.probabilidad,
        montoEstimadoMensual: monto,
        cierreEstimado: cierre ? dia(cierre) : null,
      },
    });
    await db.historialEtapa.create({
      data: { tenantId, negocioId: n.id, aEtapaId: etapa.id, actorTipo: "system" },
    });
    const inst = instalaciones.find((i) => i.nombre === instalacion)?.id;
    if (inst) {
      await db.negocioInstalacion.create({
        data: { tenantId, negocioId: n.id, instalacionId: inst, tipo: "nueva" },
      });
    }
  }
  console.log(`Negocios de demostración listos (${NEGOCIOS.length}).`);
}

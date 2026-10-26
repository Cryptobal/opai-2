// Brief 11 · Puestos PR 1 (CAR-8). Divide los puestos con `dotacion > 1` en N puestos (1 puesto =
// 1 posición), como decidió Carlos (decisión 1 del alcance). La columna `dotacion` queda deprecada.
//
// Idempotente: tras aplicar, ningún puesto queda con dotacion > 1, así que volver a correrlo no hace
// nada. Lo ejecuta Carlos, no el PR.
//
// Uso (rol propietario de la base indicada):
//   DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db tsx scripts/dividir-dotacion.ts            # simula (por defecto)
//   DATABASE_URL_MIGRATE=<url propietario> pnpm --filter @opai/db tsx scripts/dividir-dotacion.ts --apply     # aplica
//
// Por seguridad SIMULA por defecto (como un --dry-run); solo escribe con --apply.
import "dotenv/config";

import { cerrarClientes, dbAdmin } from "../src/index";

/** Nombre libre para la posición k dentro de (tenant, instalación): "<nombre> (k)", evitando choques. */
function nombreLibre(base: string, k: number, usados: Set<string>): string {
  let intento = `${base} (${k})`;
  let n = k;
  while (usados.has(intento)) intento = `${base} (${++n})`;
  usados.add(intento);
  return intento;
}

async function main(): Promise<void> {
  const aplicar = process.argv.includes("--apply");
  const db = dbAdmin();

  const puestos = await db.puesto.findMany({
    where: { dotacion: { gt: 1 } },
    orderBy: [{ tenantId: "asc" }, { instalacionId: "asc" }, { nombre: "asc" }],
  });

  if (puestos.length === 0) {
    console.log("No hay puestos con dotación mayor que 1. Nada que dividir.");
    return;
  }

  // Nombres ya usados por instalación, para no chocar con el índice único (tenant, instalación, nombre).
  const usadosPorInstalacion = new Map<string, Set<string>>();
  for (const inst of new Set(puestos.map((p) => p.instalacionId))) {
    const filas = await db.puesto.findMany({ where: { instalacionId: inst }, select: { nombre: true } });
    usadosPorInstalacion.set(inst, new Set(filas.map((f) => f.nombre)));
  }

  let posicionesCreadas = 0;
  const porInstalacion = new Map<string, { nombre: string; de: number }[]>();

  for (const p of puestos) {
    const usados = usadosPorInstalacion.get(p.instalacionId) ?? new Set<string>();
    const copias = p.dotacion - 1; // la posición 1 es el puesto original (dotacion → 1)
    const nombres: string[] = [];
    for (let k = 2; k <= p.dotacion; k++) nombres.push(nombreLibre(p.nombre, k, usados));

    if (aplicar) {
      await db.$transaction(async (tx) => {
        await tx.puesto.update({ where: { id: p.id }, data: { dotacion: 1 } });
        const b = await tx.puesto.findUniqueOrThrow({ where: { id: p.id } });
        for (const nombre of nombres) {
          await tx.puesto.create({
            data: {
              tenantId: b.tenantId,
              instalacionId: b.instalacionId,
              cargoId: b.cargoId,
              funcionId: b.funcionId,
              patronId: b.patronId,
              nombre,
              diasTrabajo: b.diasTrabajo,
              diasDescanso: b.diasDescanso,
              horaInicio: b.horaInicio,
              horaFin: b.horaFin,
              horaInicioNoche: b.horaInicioNoche,
              horaFinNoche: b.horaFinNoche,
              jornada: b.jornada,
              horasSemanales: b.horasSemanales,
              colacionMin: b.colacionMin,
              colacionFuera: b.colacionFuera,
              dotacion: 1,
              cobertura: "ppc",
              coberturaMotivo: "sin_asignar",
              estado: b.estado,
              vigenteDesde: b.vigenteDesde,
              vigenteHasta: b.vigenteHasta,
              notas: b.notas,
            },
          });
        }
      });
    }

    posicionesCreadas += copias;
    const lista = porInstalacion.get(p.instalacionId) ?? [];
    lista.push({ nombre: p.nombre, de: p.dotacion });
    porInstalacion.set(p.instalacionId, lista);
  }

  console.log(aplicar ? "== División aplicada ==" : "== Simulación (usa --apply para escribir) ==");
  console.log(`Puestos con dotación > 1: ${puestos.length}`);
  console.log(`Instalaciones afectadas: ${porInstalacion.size}`);
  console.log(`Posiciones nuevas a crear: ${posicionesCreadas}`);
  console.log(
    `Posiciones totales tras dividir: ${puestos.reduce((s, p) => s + p.dotacion, 0)} (1 puesto = 1 posición)`,
  );
  for (const [instalacionId, filas] of porInstalacion) {
    const total = filas.reduce((s, f) => s + f.de, 0);
    console.log(`  instalación ${instalacionId}: ${filas.length} puesto(s) → ${total} posiciones`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());

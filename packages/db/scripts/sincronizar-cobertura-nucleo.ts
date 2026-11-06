// Backfill único de CAR-207 (decisión de Carlos del 6-nov-2026): la cobertura de un puesto
// («cubierto» o PPC «sin asignar») no se actualizaba al fijar la serie de la Pauta, así que los
// puestos con serie anterior a CAR-206 siguen «Por cubrir». Este núcleo la recalcula desde la serie
// que rige hoy: con titular → «cubierto»; sin serie o sin titular → PPC. Solo de UN tenant, solo
// puestos activos, y solo escribe donde la cobertura difiere. Simula por defecto.
import type { PrismaClient } from "../src/generated/prisma/client";

export type CambioCobertura = {
  puestoId: string;
  nombre: string;
  antes: { cobertura: string; coberturaMotivo: string | null };
  despues: { cobertura: "cubierto" | "ppc"; coberturaMotivo: string | null };
};

export type ResultadoCobertura = {
  tenantId: string;
  hoy: string;
  aplicado: boolean;
  revisados: number;
  cambios: CambioCobertura[];
};

/** Fecha civil de hoy en la zona de Chile (aaaa-mm-dd), la misma que usa la Pauta. */
export const hoyChile = (ahora = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(ahora);

export async function sincronizarCobertura(
  db: PrismaClient,
  o: { tenantId: string; aplicar: boolean; hoy?: string; alAplicar?: (parcial: ResultadoCobertura) => void },
): Promise<ResultadoCobertura> {
  const hoy = o.hoy ?? hoyChile();
  const fecha = new Date(`${hoy}T00:00:00.000Z`);
  const puestos = await db.puesto.findMany({
    where: { tenantId: o.tenantId, estado: "activo" },
    select: { id: true, nombre: true, cobertura: true, coberturaMotivo: true },
    orderBy: { nombre: "asc" },
  });
  const series = await db.seriePauta.findMany({
    where: {
      tenantId: o.tenantId,
      vigenteDesde: { lte: fecha },
      OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: fecha } }],
    },
    select: { puestoId: true, titularPersonaId: true },
  });
  const conTitular = new Set(series.filter((s) => s.titularPersonaId).map((s) => s.puestoId));
  const cambios: CambioCobertura[] = [];
  for (const p of puestos) {
    const cubierto = conTitular.has(p.id);
    const despues = cubierto
      ? { cobertura: "cubierto" as const, coberturaMotivo: null }
      : { cobertura: "ppc" as const, coberturaMotivo: "sin_asignar" };
    if (p.cobertura === despues.cobertura && p.coberturaMotivo === despues.coberturaMotivo) continue;
    cambios.push({ puestoId: p.id, nombre: p.nombre, antes: { cobertura: p.cobertura, coberturaMotivo: p.coberturaMotivo }, despues });
  }
  const r: ResultadoCobertura = { tenantId: o.tenantId, hoy, aplicado: o.aplicar, revisados: puestos.length, cambios };
  if (!o.aplicar) return r;
  const hechos: CambioCobertura[] = [];
  for (const c of cambios) {
    // Compare-and-set sobre el valor leído: si alguien asignó mientras tanto, no se pisa.
    const { count } = await db.puesto.updateMany({
      where: { id: c.puestoId, tenantId: o.tenantId, cobertura: c.antes.cobertura },
      data: { cobertura: c.despues.cobertura, coberturaMotivo: c.despues.coberturaMotivo },
    });
    if (count === 1) hechos.push(c);
    o.alAplicar?.({ ...r, cambios: hechos });
  }
  return { ...r, cambios: hechos };
}

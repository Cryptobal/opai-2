// Post-proceso del export opai1-export/v1: dedupe sin snapshot entre páginas y campos derivados del contrato B2.
import type { CuentaOpai1, DatosOpai1, NegocioOpai1 } from "./origen";

function dedupePorId<T extends { id: string }>(filas: readonly T[]): T[] {
  const map = new Map<string, T>();
  for (const f of filas) map.set(f.id, f);
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Clave estable para actividades (cursor del export: `nota|tarea|reunion:<id>`). */
function claveActividad(f: DatosOpai1["activities"][number]): string {
  return `${f.tipo}:${f.id}`;
}

function dedupeActividades(filas: DatosOpai1["activities"]): DatosOpai1["activities"] {
  const map = new Map<string, (typeof filas)[number]>();
  for (const f of filas) map.set(claveActividad(f), f);
  return [...map.values()].sort((a, b) => claveActividad(a).localeCompare(claveActividad(b)));
}

/** B2: el negocio no trae dueño propio; sale del `ownerId` de la cuenta. */
export function enriquecerDuenoNegocios(
  deals: readonly NegocioOpai1[],
  accounts: readonly CuentaOpai1[],
): NegocioOpai1[] {
  const ownerPorCuenta = new Map(accounts.map((a) => [a.id, a.ownerId ?? null]));
  return deals.map((d) => {
    const ownerId = d.ownerId ?? ownerPorCuenta.get(d.accountId) ?? null;
    return ownerId === d.ownerId ? d : { ...d, ownerId };
  });
}

/** Une páginas leídas en distintos momentos: gana la última fila por id (inserciones concurrentes). */
export function normalizarDatosExport(crudo: DatosOpai1): DatosOpai1 {
  return {
    ...crudo,
    accounts: dedupePorId(crudo.accounts),
    contacts: dedupePorId(crudo.contacts),
    installations: dedupePorId(crudo.installations),
    pipelineStages: dedupePorId(crudo.pipelineStages),
    deals: enriquecerDuenoNegocios(dedupePorId(crudo.deals), crudo.accounts),
    dealStageHistory: dedupePorId(crudo.dealStageHistory),
    dealContacts: dedupePorId(crudo.dealContacts),
    recurringInvoiceSchedules: dedupePorId(crudo.recurringInvoiceSchedules),
    cpqQuotes: dedupePorId(crudo.cpqQuotes),
    activities: dedupeActividades(crudo.activities),
    users: dedupePorId(crudo.users),
  };
}

import { type ClienteComercial, sembrarComercial } from "@opai/db";

/**
 * Catálogo base que un módulo necesita para funcionar, sembrado al activarlo para una empresa
 * (idempotente; activar de nuevo no duplica). Comercial: embudo por defecto con sus etapas y los
 * catálogos de tipos, orígenes y motivos de pérdida (Brief 07 · PR 1).
 */
const SIEMBRAS: Record<string, (db: ClienteComercial, tenantId: string) => Promise<void>> = {
  comercial: sembrarComercial,
};

export async function sembrarModulo(
  moduloId: string,
  db: ClienteComercial,
  tenantId: string,
): Promise<void> {
  await SIEMBRAS[moduloId]?.(db, tenantId);
}

// Valor de la UF publicada por el SII para un día exacto (BRIEF-26 · CAR-159).
// Nunca se usa la UF de otra fecha en silencio: si falta, la generación se detiene con su motivo.
import type { TenantTx } from "@opai/db";

import { aFecha } from "../core/maestros/comun";
type LectorUf = Pick<TenantTx, "indicadorLegal" | "valorPublicado">;

/** UF del día en centavos de CLP, o null si el SII no la tiene publicada para esa fecha. */
export async function ufCentavosDelDia(db: LectorUf, fecha: string): Promise<bigint | null> {
  const ind = await db.indicadorLegal.findFirst({ where: { clave: "uf" }, select: { id: true } });
  if (!ind) return null;
  const row = await db.valorPublicado.findFirst({
    where: { indicadorId: ind.id, estado: "vigente", vigenteDesde: aFecha(fecha) },
    orderBy: { createdAt: "desc" },
    select: { valorJson: true },
  });
  if (!row) return null;
  const valor = Number(row.valorJson);
  return Number.isSafeInteger(valor) && valor > 0 ? BigInt(valor) : null;
}

export const motivoSinUf = (fecha: string) => `Sin UF publicada para ${fecha}.`;

/** Última UF vigente publicada (centavos), para estimar períodos futuros; nunca para generar. */
export async function ufCentavosUltima(db: LectorUf): Promise<bigint | null> {
  const ind = await db.indicadorLegal.findFirst({ where: { clave: "uf" }, select: { id: true } });
  if (!ind) return null;
  const row = await db.valorPublicado.findFirst({
    where: { indicadorId: ind.id, estado: "vigente" },
    orderBy: { vigenteDesde: "desc" },
    select: { valorJson: true },
  });
  const valor = row ? Number(row.valorJson) : NaN;
  return Number.isSafeInteger(valor) && valor > 0 ? BigInt(valor) : null;
}

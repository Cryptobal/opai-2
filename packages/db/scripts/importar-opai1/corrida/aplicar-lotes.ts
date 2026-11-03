// Aplica decisiones en lotes (~500) con registro en importaciones_filas.
import type { Prisma } from "../../../src/generated/prisma/client";
import type { Decision } from "../comun";
import { completarVacios } from "../completar-vacios";
import type { TenantTx } from "../../../src/transaccion";
import { type AccionFila, type ConteosCorrida, sumarAccion } from "./corrida-tipos";

export const TAMANO_LOTE = 500;

export type AplicadorLote<D extends Record<string, unknown>> = (
  tx: TenantTx,
  tenantId: string,
  decision: Decision<D>,
  patch: Partial<D>,
) => Promise<{ idOpai2: string | null; accion: AccionFila; previos: Record<string, unknown> | null }>;

export async function aplicarLotes<D extends Record<string, unknown>>(
  tx: TenantTx,
  tenantId: string,
  importacionId: string,
  decisiones: readonly Decision<D>[],
  actuales: (destinoId: string) => Record<string, unknown> | undefined,
  aplicar: AplicadorLote<D>,
): Promise<ConteosCorrida> {
  const conteos: ConteosCorrida = { creados: 0, completados: 0, sinCambio: 0, omitidos: 0 };
  for (let i = 0; i < decisiones.length; i += TAMANO_LOTE) {
    const slice = decisiones.slice(i, i + TAMANO_LOTE);
    for (const d of slice) {
      if (d.accion === "conflicto" || d.accion === "omitido") {
        sumarAccion(conteos, "omitido");
        await tx.importacionFila.create({
          data: {
            tenantId,
            importacionId,
            entidad: d.entidad,
            idOpai1: d.idOpai1,
            idOpai2: d.destinoId,
            accion: "omitido",
          },
        });
        continue;
      }
      const patch =
        d.accion === "actualizar" && d.destinoId && d.datos
          ? completarVacios(d.datos, actuales(d.destinoId) ?? {}).patch
          : d.datos ?? {};
      const r = await aplicar(tx, tenantId, d, patch);
      sumarAccion(conteos, r.accion);
      await tx.importacionFila.create({
        data: {
          tenantId,
          importacionId,
          entidad: d.entidad,
          idOpai1: d.idOpai1,
          idOpai2: r.idOpai2,
          accion: r.accion,
          ...(r.previos ? { valoresPrevios: r.previos as Prisma.InputJsonValue } : {}),
        },
      });
    }
  }
  return conteos;
}

// Registro de una entrega (CAR-238): vista previa o la entrega junto con su efecto, en una transacción.
import type { TenantTx } from "@opai/db";

import { sinDuplicado } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { ID_VISTA_PREVIA } from "./comun";
import { vistaEntrega } from "./entregas-comun";

export type DatosEntrega = {
  activoId: string | null;
  tipoId: string | null;
  talla: string | null;
  cantidad: number | null;
  personaId: string | null;
  instalacionId: string | null;
  nota: string | null;
};

/** Destino y nota comunes a las dos entregas. */
export const destinoDe = (i: {
  personaId?: string | undefined;
  instalacionId?: string | undefined;
  nota?: string | undefined;
}) => ({
  personaId: i.personaId ?? null,
  instalacionId: i.instalacionId ?? null,
  nota: i.nota || null,
});

/** Vista previa o registro: el efecto (activo asignado o existencias descontadas) y la entrega van juntos (R20). */
export async function registrar(
  ctx: Contexto,
  datos: DatosEntrega,
  dryRun: boolean,
  efecto: (tx: TenantTx) => Promise<void>,
) {
  if (dryRun)
    return vistaEntrega(ctx, {
      id: ID_VISTA_PREVIA,
      entregadaEn: new Date(),
      devueltaEn: null,
      notaDevolucion: null,
      ...datos,
    });
  const fila = await ctx.transaccion(async (tx) => {
    await efecto(tx);
    const e = await sinDuplicado(
      tx.inventarioEntrega.create({ data: { ...datos, tenantId: ctx.tenantId } }),
      "El activo ya está entregado.",
    );
    const clase = datos.activoId ? "activo" : "ropa";
    await ctx.eventos.emitir(tx, {
      tipo: "inventario.entrega.registrada",
      entidadTipo: "inventario_entrega",
      entidadId: e.id,
      payload: { clase },
    });
    return e;
  });
  return vistaEntrega(ctx, fila);
}

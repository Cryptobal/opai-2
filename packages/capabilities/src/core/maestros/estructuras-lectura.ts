import type { Contexto } from "../../types";
import { ocultarMontos } from "./estructuras-acceso";
import type { FilaEstructura } from "./estructuras-vista";

/** Una auditoría de revelación por respuesta: registra cada ID, sin copiar montos ni motivos. */
export async function ocultasDe(ctx: Contexto, filas: FilaEstructura[]) {
  const ocultas = new Map(
    await Promise.all(filas.map(async (f) => [f.id, await ocultarMontos(ctx, f, false)] as const)),
  );
  const visibles = filas.filter((f) => !ocultas.get(f.id));
  const primera = visibles[0];
  if (primera)
    await ctx.transaccion((tx) =>
      ctx.auditoria.registrar(tx, {
        tenantId: ctx.tenantId,
        capability: "core.estructuras.read_sensible",
        actor: ctx.actor,
        entityType: "estructura",
        entityId: primera.id,
        payload: {
          estructuras: visibles.map((f) => ({
            id: f.id,
            nivel: f.nivel,
            cargoId: f.cargoId ?? null,
            instalacionId: f.instalacionId ?? null,
            puestoId: f.puestoId ?? null,
            personaId: f.personaId ?? null,
          })),
        },
      }),
    );
  return ocultas;
}

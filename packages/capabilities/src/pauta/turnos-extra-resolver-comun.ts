import type { TenantTx } from "@opai/db";

import { conflicto, prohibido } from "../errores";
import type { Contexto } from "../types";
import type { Anotacion } from "./anotar";
import { anotar } from "./anotar";
import { fechaIso } from "./comun";
import { quienResuelveExtra, turnoExtraPorAprobar } from "./turnos-extra-comun";

/** Carga el turno por aprobar y valida que quien resuelve no sea quien lo registró. */
export async function turnoPendienteParaResolver(
  ctx: Contexto,
  id: string,
  verbo: "aprobar" | "rechazar",
) {
  const actorId = quienResuelveExtra(ctx);
  const { t, instalacionId } = await turnoExtraPorAprobar(ctx, id);
  if (t.estado !== "por_aprobar") throw conflicto("El turno extra ya no está por aprobar.");
  if (t.registradoPor === actorId)
    throw prohibido(`No puedes ${verbo} un turno extra que tú registraste.`);
  return { actorId, t, instalacionId };
}

/** Aplica la resolución (aprobado/rechazado), anota e emite el evento. */
export async function aplicarResolucionTurnoExtra(
  tx: TenantTx,
  ctx: Contexto,
  args: {
    t: { id: string; puestoId: string; fecha: Date };
    actorId: string;
    instalacionId: string;
    data: Record<string, unknown>;
    accion: Anotacion["accion"];
    evento: "pauta.turno_extra.aprobado" | "pauta.turno_extra.rechazado";
    detalle: Record<string, string | number | null>;
  },
) {
  const r = await tx.turnoExtra.updateMany({
    where: {
      id: args.t.id,
      estado: "por_aprobar",
      OR: [{ registradoPor: null }, { registradoPor: { not: args.actorId } }],
    },
    data: args.data,
  });
  if (r.count !== 1) throw conflicto("El turno extra ya no está por aprobar o no puedes resolverlo.");
  await anotar(tx, ctx, {
    instalacionId: args.instalacionId,
    puestoId: args.t.puestoId,
    accion: args.accion,
    desde: fechaIso(args.t.fecha),
    hasta: fechaIso(args.t.fecha),
    detalle: args.detalle,
  });
  await ctx.eventos.emitir(tx, {
    tipo: args.evento,
    entidadTipo: "turno_extra",
    entidadId: args.t.id,
    payload: { puestoId: args.t.puestoId },
  });
  return tx.turnoExtra.findUniqueOrThrow({ where: { id: args.t.id } });
}

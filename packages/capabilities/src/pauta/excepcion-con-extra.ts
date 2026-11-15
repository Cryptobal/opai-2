import type { TenantTx } from "@opai/db";

import { sinDuplicado } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { anotar } from "./anotar";
import { aFechaDb } from "./comun";
import { insertarTurnoExtra } from "./turnos-extra-comun";

type PuestoExtra = { id: string; instalacionId: string };

type ArgsExtra = {
  puesto: PuestoExtra;
  fecha: string;
  personaId: string;
  tipo: "reemplazo" | "refuerzo";
  motivo: string;
  tipoTrabajador: "propio" | "externo";
  accionHistorial: "reemplazo_asignado" | "refuerzo_agregado";
};

async function emitirCreados(
  tx: TenantTx,
  ctx: Contexto,
  args: ArgsExtra,
  ids: { excepcionId: string; turnoExtraId: string },
): Promise<void> {
  await ctx.eventos.emitir(tx, {
    tipo: "pauta.excepcion.creada",
    entidadTipo: "puesto",
    entidadId: args.puesto.id,
    payload: {
      puestoId: args.puesto.id,
      tipo: args.tipo,
      desde: args.fecha,
      hasta: args.fecha,
    },
  });
  await ctx.eventos.emitir(tx, {
    tipo: "pauta.turno_extra.registrado",
    entidadTipo: "turno_extra",
    entidadId: ids.turnoExtraId,
    payload: { puestoId: args.puesto.id, excepcionId: ids.excepcionId },
  });
}

/** Crea la excepción de reemplazo/refuerzo y su turno extra por aprobar (misma transacción). */
export async function crearExcepcionConTurnoExtra(
  tx: TenantTx,
  ctx: Contexto,
  args: ArgsExtra,
): Promise<{ excepcionId: string; turnoExtraId: string }> {
  const ex = await sinDuplicado(
    tx.excepcionPauta.create({
      data: {
        tenantId: ctx.tenantId,
        puestoId: args.puesto.id,
        fecha: aFechaDb(args.fecha),
        tipo: args.tipo,
        motivo: args.motivo,
        personaId: args.personaId,
        creadaPor: ctx.usuario?.id ?? null,
      },
    }),
    "Ya hay una excepción activa ese día.",
  );
  const extra = await insertarTurnoExtra(tx, ctx, {
    puestoId: args.puesto.id,
    instalacionId: args.puesto.instalacionId,
    fecha: args.fecha,
    personaId: args.personaId,
    excepcionId: ex.id,
    tipoTrabajador: args.tipoTrabajador,
  });
  await anotar(tx, ctx, {
    instalacionId: args.puesto.instalacionId,
    puestoId: args.puesto.id,
    accion: args.accionHistorial,
    desde: args.fecha,
    hasta: args.fecha,
    detalle: { personaId: args.personaId, turnoExtraId: extra.id },
  });
  await emitirCreados(tx, ctx, args, { excepcionId: ex.id, turnoExtraId: extra.id });
  return { excepcionId: ex.id, turnoExtraId: extra.id };
}

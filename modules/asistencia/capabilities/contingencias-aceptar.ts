import type { Contexto } from "@opai/capabilities";
import { avanzarCadena, bloquearCadena, type TenantTx } from "@opai/db";

import { hashDeMarca } from "../domain";
import { snapshotDe } from "./armar-registro";

type FilaContingencia = { id: string; personaId: string; instalacionId: string; tipo: string; horaDeclarada: Date; motivo: string };

/** Al aceptarla el trabajador, la contingencia entra a la cadena como una marca nueva de origen «contingencia». */
export async function agregarMarcaDeContingencia(ctx: Contexto, tx: TenantTx, c: FilaContingencia): Promise<string> {
  const inst = await tx.instalacion.findUniqueOrThrow({ where: { id: c.instalacionId }, include: { cuenta: { select: { razonSocial: true, rut: true, nombre: true } } } });
  const jornada = await tx.personaJornadaDt.findUnique({ where: { personaId: c.personaId }, select: { resolucion: true, resolucionVigenteDesde: true } });
  const ahora = new Date();
  const { siguienteSeq, hashAnterior } = await bloquearCadena(tx, ctx.tenantId, "marcas");
  const registro = {
    tenantId: ctx.tenantId, seq: siguienteSeq, personaId: c.personaId, tipo: c.tipo as never, horaServidor: ahora,
    horaDispositivo: c.horaDeclarada, desfaseS: Math.round((ahora.getTime() - c.horaDeclarada.getTime()) / 1000),
    origen: "contingencia" as const, metodo: "manual_contingencia" as const, motivoRespaldo: c.motivo.slice(0, 200),
    confianza: null, pruebaVida: null, dispositivoId: null, canal: null, instalacionId: c.instalacionId,
    lat: null, lng: null, precisionM: null, gpsEstado: "sin_gps" as const, distanciaM: null,
    turnoEsperadoId: null, turnoInicio: null, turnoFin: null,
    snapshot: snapshotDe(
      { id: inst.id, nombre: inst.nombre, lat: null, lng: null, cuenta: inst.cuenta },
      jornada?.resolucion ? { numero: jornada.resolucion, fecha: jornada.resolucionVigenteDesde?.toISOString().slice(0, 10) ?? "" } : null,
    ),
    idempotencyKey: `contingencia:${c.id}`,
  };
  const hash = await hashDeMarca(hashAnterior, registro);
  const m = await tx.marca.create({ data: { ...registro, hash, hashAnterior } });
  await avanzarCadena(tx, ctx.tenantId, "marcas", siguienteSeq, hash);
  await ctx.eventos.emitir(tx, { tipo: "asistencia.marca.registrada", entidadTipo: "marca", entidadId: m.id,
    payload: { marcaId: m.id, personaId: c.personaId, tipo: c.tipo, instalacionId: c.instalacionId, gpsEstado: "sin_gps" } });
  return m.id;
}

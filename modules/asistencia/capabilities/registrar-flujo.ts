import type { Contexto } from "@opai/capabilities";
import { ajuste, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";
import { avanzarCadena, bloquearCadena, type TenantTx } from "@opai/db";

import { hashDeMarca, type Metodo } from "../domain";
import type { MotivoRespaldo } from "../domain/biometria";
import type { EntradaMarca } from "./armar-registro";
import { MENSAJE_IDENTIDAD, resolverCanal } from "./canal";
import { armarRegistro } from "./armar-registro";
import { vistaDeMarca } from "./esquemas";
import { verificadorDe } from "./identidad-registro";

type EntradaRegistro = EntradaMarca & {
  metodo: Metodo;
  credencial?: string | undefined;
  motivoRespaldo?: MotivoRespaldo | undefined;
  muestra?: string | undefined;
};

export async function cargarEntidadesMarca(
  ctx: Contexto,
  personaId: string,
  instalacionId: string,
) {
  const persona = await ctx.db.persona.findFirst({
    where: { id: personaId, archivadaEn: null, anonimizadaEn: null },
  });
  const instalacion = await ctx.db.instalacion.findFirst({
    where: { id: instalacionId },
    include: { cuenta: { select: { razonSocial: true, rut: true, nombre: true } } },
  });
  if (!persona || !instalacion) throw noEncontrado("La persona o la instalación");
  const vinculo = await ctx.db.vinculoLaboral.findFirst({ where: { personaId: persona.id, estado: "vigente" } });
  if (!vinculo) throw reglaDeNegocio("La persona no tiene un vínculo laboral vigente.");
  return { persona, instalacion };
}

export async function verificarIdentidadMarca(
  ctx: Contexto,
  i: EntradaRegistro,
  personaId: string,
  dryRun: boolean,
) {
  if (i.metodo === "pin_respaldo" && !i.motivoRespaldo && (await ajuste<boolean>(ctx, "asistencia", "pin_respaldo_exige_motivo")))
    throw reglaDeNegocio("Indica por qué marcas con el PIN de respaldo.");
  const id = dryRun && i.metodo === "rostro"
    ? ({ ok: true, metodo: "rostro", motivoRespaldo: null, confianza: null, pruebaVida: null } as const)
    : await (await verificadorDe(ctx)).verificar({
        personaId, metodo: i.metodo, credencial: i.credencial, motivoRespaldo: i.motivoRespaldo, muestra: i.muestra,
      });
  if (!id.ok) throw prohibido(MENSAJE_IDENTIDAD[id.motivo]);
  return id;
}

export async function datosArmadoMarca(
  ctx: Contexto,
  personaId: string,
  instalacion: Awaited<ReturnType<typeof cargarEntidadesMarca>>["instalacion"],
  identidad: Awaited<ReturnType<typeof verificarIdentidadMarca>>,
) {
  const jornada = await ctx.db.personaJornadaDt.findUnique({
    where: { personaId }, select: { resolucion: true, resolucionVigenteDesde: true },
  });
  return {
    tenantId: ctx.tenantId,
    personaId,
    instalacion,
    resolucion: jornada?.resolucion
      ? { numero: jornada.resolucion, fecha: jornada.resolucionVigenteDesde?.toISOString().slice(0, 10) ?? "" }
      : null,
    radioM: instalacion.geocercaM ?? (await ajuste<number>(ctx, "asistencia", "geocerca_radio_m")),
    identidad: {
      metodo: identidad.metodo,
      motivoRespaldo: identidad.motivoRespaldo,
      confianza: identidad.confianza,
      pruebaVida: identidad.pruebaVida,
    },
  };
}

export async function persistirMarca(
  ctx: Contexto,
  i: EntradaRegistro,
  personaId: string,
  datos: Awaited<ReturnType<typeof datosArmadoMarca>>,
  instalacionId: string,
) {
  return ctx.transaccion(async (tx: TenantTx) => {
    const { siguienteSeq, hashAnterior } = await bloquearCadena(tx, ctx.tenantId, "marcas");
    const existente = await tx.marca.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: ctx.tenantId, idempotencyKey: i.claveDispositivo } },
    });
    if (existente) {
      if (existente.personaId !== personaId) throw reglaDeNegocio("La clave del dispositivo ya se usó.");
      return { marca: vistaDeMarca(existente), repetida: true };
    }
    const registro = await armarRegistro(tx, { ...datos, seq: siguienteSeq }, i);
    const hash = await hashDeMarca(hashAnterior, registro);
    const { snapshot, ...resto } = registro;
    const fila = await tx.marca.create({ data: { ...resto, snapshot, hash, hashAnterior } });
    await avanzarCadena(tx, ctx.tenantId, "marcas", registro.seq, hash);
    await ctx.bitacora.registrar(tx, {
      tipo: "asistencia.marca.registrada", entidadTipo: "marca", entidadId: fila.id,
      payload: { seq: registro.seq, tipo: registro.tipo, hash, personaId },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "asistencia.marca.registrada", entidadTipo: "marca", entidadId: fila.id,
      payload: {
        marcaId: fila.id, personaId, tipo: registro.tipo, instalacionId, gpsEstado: registro.gpsEstado,
        turnoInicio: registro.turnoInicio?.toISOString() ?? null, horaServidor: registro.horaServidor.toISOString(),
        distanciaM: registro.distanciaM == null ? null : Number(registro.distanciaM), origen: registro.origen,
      },
    });
    return { marca: vistaDeMarca(fila), repetida: false };
  });
}

export { resolverCanal };
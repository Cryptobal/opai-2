import { z } from "zod";

import { ajuste, defineCapability, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";
import { avanzarCadena, bloquearCadena } from "@opai/db";

import { CANALES, hashDeMarca, METODOS, MOTIVOS_RESPALDO } from "../domain";
import { MENSAJE_IDENTIDAD, resolverCanal } from "./canal";
import { armarRegistro } from "./armar-registro";
import { marcaVistaSchema, uuid, vistaDeMarca } from "./esquemas";
import { verificadorDe } from "./identidad-registro";

export const marcasRegistrar = defineCapability({
  id: "asistencia.marcas.registrar",
  descripcion:
    "Registra una marca legal de asistencia de un trabajador (entrada, salida o colación) con la hora del servidor, su identificación, el turno esperado y la ubicación como evidencia. El GPS nunca bloquea la marca. Solo la hace una persona desde Terreno o el Portal Trabajador: un agente nunca marca por un trabajador.",
  permiso: null,
  portales: ["terreno", "trabajador"],
  soloPersonas: true,
  sensibles: ["credencial", "muestra"],
  input: z.object({
    personaId: uuid,
    instalacionId: uuid,
    metodo: z.enum(METODOS),
    /** PIN u otro secreto del método; nunca se guarda. */
    credencial: z.string().max(64).optional(),
    /** Obligatorio al marcar con `pin_respaldo` (si la empresa lo exige): por qué no se usó el rostro. */
    motivoRespaldo: z.enum(MOTIVOS_RESPALDO).optional(),
    /** Muestra del rostro con su prueba de vida, tal como la entrega la cámara (método `rostro`). No se guarda. */
    muestra: z.string().min(8).max(2_000_000).optional(),
    /** Solo para pedir una colación; entrada y salida las decide el sistema (resolverTipo). */
    tipo: z.enum(["inicio_colacion", "fin_colacion"]).optional(),
    /** Clave que genera el dispositivo: reintentar no duplica (T-06). */
    claveDispositivo: z.string().min(8).max(128),
    origen: z.enum(["en_linea", "offline_queue"]).default("en_linea"),
    horaDispositivo: z.string().datetime().optional(),
    canal: z.enum(CANALES).optional(),
    dispositivoId: uuid.optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    precisionM: z.number().min(0).max(100_000).optional(),
  }),
  output: z.object({ marca: marcaVistaSchema, repetida: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (!(await ajuste<boolean>(ctx, "asistencia", "marcas_habilitadas")))
      throw reglaDeNegocio("Las marcas de asistencia aún no están habilitadas en esta empresa.");
    const persona = await ctx.db.persona.findFirst({ where: { id: i.personaId, archivadaEn: null, anonimizadaEn: null } });
    const instalacion = await ctx.db.instalacion.findFirst({
      where: { id: i.instalacionId }, include: { cuenta: { select: { razonSocial: true, rut: true, nombre: true } } },
    });
    if (!persona || !instalacion) throw noEncontrado("La persona o la instalación");
    const vinculo = await ctx.db.vinculoLaboral.findFirst({ where: { personaId: persona.id, estado: "vigente" } });
    if (!vinculo) throw reglaDeNegocio("La persona no tiene un vínculo laboral vigente.");
    // Un reintento de red tras una marca ya hecha devuelve esa marca sin volver a verificar (ni gastar al proveedor).
    const previa = dryRun ? null : await ctx.db.marca.findUnique({ where: { tenantId_idempotencyKey: { tenantId: ctx.tenantId, idempotencyKey: i.claveDispositivo } } });
    if (previa?.personaId === persona.id) return { marca: vistaDeMarca(previa), repetida: true };
    // El canal lo decide quién llama (equipo o sesión), no el cliente.
    const canal = await resolverCanal(ctx, i, persona.id, instalacion.id);
    i = { ...i, canal };
    if (i.metodo === "pin_respaldo" && !i.motivoRespaldo && (await ajuste<boolean>(ctx, "asistencia", "pin_respaldo_exige_motivo")))
      throw reglaDeNegocio("Indica por qué marcas con el PIN de respaldo.");
    // La vista previa no consume la prueba de vida (es de un solo uso): el rostro solo se verifica al marcar de verdad.
    const id = dryRun && i.metodo === "rostro"
      ? ({ ok: true, metodo: "rostro", motivoRespaldo: null, confianza: null, pruebaVida: null } as const)
      : await (await verificadorDe(ctx)).verificar({
          personaId: persona.id, metodo: i.metodo, credencial: i.credencial, motivoRespaldo: i.motivoRespaldo,
          muestra: i.muestra,
        });
    if (!id.ok) throw prohibido(MENSAJE_IDENTIDAD[id.motivo]);
    const jornada = await ctx.db.personaJornadaDt.findUnique({
      where: { personaId: persona.id }, select: { resolucion: true, resolucionVigenteDesde: true },
    });
    const datos = {
      tenantId: ctx.tenantId, personaId: persona.id, instalacion,
      resolucion: jornada?.resolucion
        ? { numero: jornada.resolucion, fecha: jornada.resolucionVigenteDesde?.toISOString().slice(0, 10) ?? "" }
        : null,
      radioM: instalacion.geocercaM ?? (await ajuste<number>(ctx, "asistencia", "geocerca_radio_m")),
      identidad: { metodo: id.metodo, motivoRespaldo: id.motivoRespaldo, confianza: id.confianza, pruebaVida: id.pruebaVida },
    };
    if (dryRun) return { marca: vistaDeMarca({ ...(await armarRegistro(ctx.db, { ...datos, seq: 0 }, i)), id: "", hash: "" }), repetida: false };
    return ctx.transaccion(async (tx) => {
      const { siguienteSeq, hashAnterior } = await bloquearCadena(tx, ctx.tenantId, "marcas");
      // Con la cadena bloqueada, un reintento concurrente con la misma clave devuelve la marca ya hecha.
      const existente = await tx.marca.findUnique({
        where: { tenantId_idempotencyKey: { tenantId: ctx.tenantId, idempotencyKey: i.claveDispositivo } },
      });
      if (existente) {
        if (existente.personaId !== persona.id) throw reglaDeNegocio("La clave del dispositivo ya se usó.");
        return { marca: vistaDeMarca(existente), repetida: true };
      }
      const registro = await armarRegistro(tx, { ...datos, seq: siguienteSeq }, i);
      const hash = await hashDeMarca(hashAnterior, registro);
      const { snapshot, ...resto } = registro;
      const fila = await tx.marca.create({ data: { ...resto, snapshot, hash, hashAnterior } });
      await avanzarCadena(tx, ctx.tenantId, "marcas", registro.seq, hash);
      await ctx.bitacora.registrar(tx, {
        tipo: "asistencia.marca.registrada", entidadTipo: "marca", entidadId: fila.id,
        payload: { seq: registro.seq, tipo: registro.tipo, hash, personaId: persona.id },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "asistencia.marca.registrada", entidadTipo: "marca", entidadId: fila.id,
        // turnoInicio, horaServidor y distanciaM (aditivos, CAR-293): Slack calcula atraso y fuera de zona sin leer la marca.
        payload: { marcaId: fila.id, personaId: persona.id, tipo: registro.tipo, instalacionId: instalacion.id, gpsEstado: registro.gpsEstado,
          turnoInicio: registro.turnoInicio?.toISOString() ?? null, horaServidor: registro.horaServidor.toISOString(),
          distanciaM: registro.distanciaM == null ? null : Number(registro.distanciaM), origen: registro.origen },
      });
      return { marca: vistaDeMarca(fila), repetida: false };
    });
  },
});

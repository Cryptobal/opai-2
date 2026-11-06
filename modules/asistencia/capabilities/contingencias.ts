import { z } from "zod";

import { conflicto, defineCapability, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";
import { avanzarCadena, bloquearCadena } from "@opai/db";

import { hashDeMarca, TIPOS_MARCA } from "../domain";
import { snapshotDe } from "./armar-registro";
import { uuid } from "./esquemas";
import { usuarioId } from "./usuario";

const alcanceDe = (alcance: { instalaciones: readonly string[] } | null) =>
  alcance ? { instalacionId: { in: [...alcance.instalaciones] } } : {};

const vistaSchema = z.object({
  id: z.string(), personaId: z.string(), instalacionId: z.string(), tipo: z.enum(TIPOS_MARCA),
  horaDeclarada: z.string(), motivo: z.string(), estado: z.enum(["pendiente", "aceptada", "rechazada"]),
  evidenciaDocumentoId: z.string().nullable(), marcaId: z.string().nullable(),
});

export const contingenciasRegistrar = defineCapability({
  id: "asistencia.contingencias.registrar",
  descripcion:
    "RR. HH. registra una marca de contingencia (cuando el sistema no estuvo disponible) con autor, motivo y evidencia en documentos. No cuenta para la asistencia ni la nómina hasta que otra persona la acepta.",
  permiso: "asistencia:corregir",
  input: z.object({
    personaId: uuid, instalacionId: uuid, tipo: z.enum(TIPOS_MARCA),
    horaDeclarada: z.string().datetime(), motivo: z.string().trim().min(10).max(500),
    evidenciaDocumentoId: uuid.optional(),
  }),
  output: vistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const inst = await ctx.db.instalacion.findFirst({ where: { id: i.instalacionId, ...(ctx.alcance ? { id: { in: [...ctx.alcance.instalaciones] } } : {}) } });
    const persona = await ctx.db.persona.findFirst({ where: { id: i.personaId, archivadaEn: null, anonimizadaEn: null } });
    if (!inst || !persona) throw noEncontrado("La persona o la instalación");
    if (i.evidenciaDocumentoId && !(await ctx.db.documento.findUnique({ where: { id: i.evidenciaDocumentoId }, select: { id: true } })))
      throw noEncontrado("El documento de evidencia");
    if (new Date(i.horaDeclarada).getTime() > Date.now()) throw reglaDeNegocio("La hora declarada no puede estar en el futuro.");
    const base = {
      id: "", personaId: i.personaId, instalacionId: i.instalacionId, tipo: i.tipo, horaDeclarada: i.horaDeclarada,
      motivo: i.motivo, estado: "pendiente" as const, evidenciaDocumentoId: i.evidenciaDocumentoId ?? null, marcaId: null,
    };
    if (dryRun) return base;
    const f = await ctx.transaccion(async (tx) => {
      const fila = await tx.contingencia.create({
        data: { tenantId: ctx.tenantId, personaId: i.personaId, instalacionId: i.instalacionId, tipo: i.tipo,
          horaDeclarada: new Date(i.horaDeclarada), motivo: i.motivo, autorId: usuarioId(ctx),
          evidenciaDocumentoId: i.evidenciaDocumentoId ?? null },
      });
      await ctx.bitacora.registrar(tx, { tipo: "asistencia.contingencia.registrada", entidadTipo: "contingencia", entidadId: fila.id, payload: { tipo: i.tipo } });
      return fila;
    });
    return { ...base, id: f.id };
  },
});

export const contingenciasListar = defineCapability({
  id: "asistencia.contingencias.listar",
  descripcion: "Lista las marcas de contingencia de las instalaciones a cargo, con su estado (pendiente, aceptada o rechazada).",
  permiso: "asistencia:ver",
  input: z.object({ estado: z.enum(["pendiente", "aceptada", "rechazada"]).optional() }),
  output: z.object({ items: z.array(vistaSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((c) => c.id),
  async handler(ctx, i) {
    const filas = await ctx.db.contingencia.findMany({
      where: { ...(i.estado ? { estado: i.estado } : {}), ...alcanceDe(ctx.alcance) }, orderBy: { createdAt: "desc" }, take: 200,
    });
    return { items: filas.map((f) => ({ id: f.id, personaId: f.personaId, instalacionId: f.instalacionId, tipo: f.tipo as never, horaDeclarada: f.horaDeclarada.toISOString(), motivo: f.motivo, estado: f.estado as never, evidenciaDocumentoId: f.evidenciaDocumentoId, marcaId: f.marcaId })) };
  },
});

export const contingenciasResolver = defineCapability({
  id: "asistencia.contingencias.resolver",
  descripcion:
    "Acepta o rechaza una marca de contingencia pendiente. Quien la resuelve no puede ser quien la registró. Al aceptarla se agrega a la cadena una marca de origen «contingencia» con la hora declarada; recién entonces cuenta para la asistencia y la nómina.",
  permiso: "asistencia:corregir",
  input: z.object({ contingenciaId: uuid, decision: z.enum(["aceptada", "rechazada"]), motivo: z.string().trim().max(500).optional() }),
  output: vistaSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const c = await ctx.db.contingencia.findFirst({ where: { id: i.contingenciaId, ...alcanceDe(ctx.alcance) } });
    if (!c) throw noEncontrado("La contingencia");
    if (c.estado !== "pendiente") throw conflicto("Esta contingencia ya fue resuelta.");
    if (c.autorId === usuarioId(ctx)) throw prohibido("La contingencia debe resolverla otra persona, no quien la registró.");
    if (i.decision === "rechazada" && (i.motivo?.trim().length ?? 0) < 3) throw reglaDeNegocio("Para rechazar indica el motivo.");
    const vista = (estado: "aceptada" | "rechazada", marcaId: string | null) => ({
      id: c.id, personaId: c.personaId, instalacionId: c.instalacionId, tipo: c.tipo as never,
      horaDeclarada: c.horaDeclarada.toISOString(), motivo: c.motivo, estado, evidenciaDocumentoId: c.evidenciaDocumentoId, marcaId,
    });
    if (dryRun) return vista(i.decision, null);
    return ctx.transaccion(async (tx) => {
      let marcaId: string | null = null;
      if (i.decision === "aceptada") {
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
        marcaId = m.id;
      }
      await tx.contingencia.update({ where: { id: c.id }, data: { estado: i.decision, marcaId, resueltaPorId: usuarioId(ctx), resueltaEn: new Date(), motivoResolucion: i.motivo ?? null } });
      await ctx.bitacora.registrar(tx, { tipo: "asistencia.contingencia.resuelta", entidadTipo: "contingencia", entidadId: c.id, payload: { decision: i.decision, marcaId } });
      return vista(i.decision, marcaId);
    });
  },
});

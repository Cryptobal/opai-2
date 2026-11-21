import { z } from "zod";

import { conflicto, defineCapability, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { TIPOS_MARCA } from "../domain";
import { vistaContingenciaSchema } from "./contingencias-esquema";
import { resolverContingencia } from "./contingencias-resolver";
import { ETIQUETA_TIPO, nombreCompleto } from "./formato";
import { uuid } from "./esquemas";
import { personaPropia } from "./persona-propia";
import { usuarioId } from "./usuario";

export const contingenciasRegistrar = defineCapability({
  id: "asistencia.contingencias.registrar",
  descripcion:
    "RR. HH. o el supervisor proponen una marca de contingencia (cuando el sistema no estuvo disponible) con autor, motivo y evidencia obligatoria en documentos. No cuenta para la asistencia ni la nómina hasta que el trabajador la acepta.",
  permiso: "asistencia:corregir",
  input: z.object({
    personaId: uuid, instalacionId: uuid, tipo: z.enum(TIPOS_MARCA),
    horaDeclarada: z.string().datetime(), motivo: z.string().trim().min(10).max(500),
    /** Documento del núcleo que respalda la contingencia: obligatorio (decisión de Carlos del 5-nov-2026). */
    evidenciaDocumentoId: uuid,
  }),
  output: vistaContingenciaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const inst = await ctx.db.instalacion.findFirst({
      where: { id: i.instalacionId, ...(ctx.alcance ? { id: { in: [...ctx.alcance.instalaciones] } } : {}) },
    });
    const persona = await ctx.db.persona.findFirst({ where: { id: i.personaId, archivadaEn: null, anonimizadaEn: null } });
    if (!inst || !persona) throw noEncontrado("La persona o la instalación");
    if (!(await ctx.db.documento.findUnique({ where: { id: i.evidenciaDocumentoId }, select: { id: true } })))
      throw noEncontrado("El documento de evidencia");
    if (new Date(i.horaDeclarada).getTime() > Date.now()) throw reglaDeNegocio("La hora declarada no puede estar en el futuro.");
    const base = {
      id: "", personaId: i.personaId, personaNombre: nombreCompleto(persona), instalacionId: i.instalacionId,
      instalacionNombre: inst.nombre, tipo: i.tipo, tipoEtiqueta: ETIQUETA_TIPO[i.tipo] ?? i.tipo,
      horaDeclarada: i.horaDeclarada, motivo: i.motivo, estado: "pendiente" as const,
      evidenciaDocumentoId: i.evidenciaDocumentoId, marcaId: null,
    };
    if (dryRun) return base;
    const f = await ctx.transaccion(async (tx) => {
      const fila = await tx.contingencia.create({
        data: { tenantId: ctx.tenantId, personaId: i.personaId, instalacionId: i.instalacionId, tipo: i.tipo,
          horaDeclarada: new Date(i.horaDeclarada), motivo: i.motivo, autorId: usuarioId(ctx),
          evidenciaDocumentoId: i.evidenciaDocumentoId },
      });
      await ctx.bitacora.registrar(tx, { tipo: "asistencia.contingencia.registrada", entidadTipo: "contingencia", entidadId: fila.id, payload: { tipo: i.tipo } });
      await ctx.eventos.emitir(tx, { tipo: "asistencia.contingencia.propuesta", entidadTipo: "contingencia", entidadId: fila.id, payload: { contingenciaId: fila.id, personaId: i.personaId } });
      return fila;
    });
    return { ...base, id: f.id };
  },
});

export const contingenciasResponder = defineCapability({
  id: "asistencia.contingencias.responder",
  descripcion:
    "El trabajador acepta u objeta, desde su portal, una marca de contingencia que RR. HH. o su supervisor propusieron a su nombre. Objetar exige un comentario. Al aceptarla se agrega a la cadena una marca de origen «contingencia» con la hora declarada; recién entonces cuenta para la asistencia y la nómina. Es una decisión suya: un agente no responde por un trabajador.",
  permiso: null,
  portales: ["trabajador", "terreno"],
  soloPersonas: true,
  input: z.object({ contingenciaId: uuid, decision: z.enum(["aceptada", "rechazada"]), comentario: z.string().trim().max(500).optional() }),
  output: vistaContingenciaSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const yo = await personaPropia(ctx);
    const c = await ctx.db.contingencia.findFirst({ where: { id: i.contingenciaId, personaId: yo.id } });
    if (!c) throw noEncontrado("La contingencia");
    if (c.estado !== "pendiente") throw conflicto("Esta contingencia ya fue respondida.");
    const yoId = yo.usuarioId ?? "";
    if (c.autorId === yoId) throw prohibido("Quien propuso la contingencia no puede responderla.");
    if (i.decision === "rechazada" && (i.comentario?.trim().length ?? 0) < 3) throw reglaDeNegocio("Para objetar escribe un comentario.");
    const [persona, inst] = await Promise.all([
      ctx.db.persona.findUniqueOrThrow({ where: { id: c.personaId }, select: { nombres: true, apellidos: true } }),
      ctx.db.instalacion.findUniqueOrThrow({ where: { id: c.instalacionId }, select: { nombre: true } }),
    ]);
    const vista = (estado: "aceptada" | "rechazada", marcaId: string | null) => ({
      id: c.id,
      personaId: c.personaId,
      personaNombre: nombreCompleto(persona),
      instalacionId: c.instalacionId,
      instalacionNombre: inst.nombre,
      tipo: c.tipo as never,
      tipoEtiqueta: ETIQUETA_TIPO[c.tipo] ?? c.tipo,
      horaDeclarada: c.horaDeclarada.toISOString(),
      motivo: c.motivo,
      estado,
      evidenciaDocumentoId: c.evidenciaDocumentoId,
      marcaId,
    });
    if (dryRun) return vista(i.decision, null);
    const marcaId = await ctx.transaccion((tx) => resolverContingencia(ctx, tx, c, i.decision, i.comentario, yoId));
    return vista(i.decision, marcaId);
  },
});

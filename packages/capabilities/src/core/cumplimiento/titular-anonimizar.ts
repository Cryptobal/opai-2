import { z } from "zod";

import type { TenantTx } from "@opai/db";
import { PERMISOS_CORE, elegibilidadPersona, fechaCorte, reglaDe } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { cargarTitular, titularSchema } from "./comunes";
import { diasDeRegla } from "./retencion-politica";
import { anonimizarContacto, anonimizarPersona, solicitudesAbiertas } from "./retencion-anonimizar";

const MOTIVOS: Record<string, string> = {
  vinculo_vigente: "La persona tiene una relación laboral vigente: no se puede anonimizar.",
  politica_sin_definir:
    "No hay periodo de conservación laboral confirmado en la política de retención: no se puede probar que ya venció.",
  en_conservacion: "La obligación legal de conservar los datos laborales sigue corriendo.",
};

const OTRAS = "El titular tiene otras solicitudes abiertas; resuélvelas antes de anonimizarlo.";

const salida = z.object({
  titular: z.object({ tipo: z.string(), id: z.string() }),
  /** Procede anonimizarlo ahora (respeta los hechos regulados, ADR-023). */
  elegible: z.boolean(),
  anonimizado: z.boolean(),
  yaEstabaAnonimizado: z.boolean(),
  motivo: z.string().nullable(),
  /** Desde cuándo procede, si hoy lo impide un plazo de conservación (ISO). */
  procedeDesde: z.string().nullable(),
  /** Documentos vinculados que esta acción NO toca (su política está pendiente). */
  documentosVinculados: z.number(),
});

/** Carga y valida la solicitud de cancelación que respalda la anonimización, si se indicó. */
async function validarSolicitud(db: TenantTx, id: string, tipo: string, titularId: string) {
  const s = await db.solicitudArco.findUnique({ where: { id } });
  if (!s) throw noEncontrado("La solicitud");
  if (s.tipo !== "cancelacion")
    throw reglaDeNegocio("La solicitud indicada no es de cancelación.");
  if (s.estado === "resuelta" || s.estado === "rechazada")
    throw reglaDeNegocio("La solicitud ya está cerrada.");
  if (s.titularTipo !== tipo || s.titularId !== titularId)
    throw reglaDeNegocio("La solicitud no corresponde a este titular.");
}

export const titularAnonimizar = defineCapability({
  id: "core.cumplimiento.titular_anonimizar",
  descripcion:
    "Anonimiza a un titular concreto (persona o contacto) a pedido, p. ej. por una solicitud de cancelación (Ley 21.719). Quita su identidad y conserva los hechos regulados; una persona con vínculo laboral vigente o dentro del plazo de conservación se rechaza. Es la única purga forzada: acto humano, con vista previa y auditoría.",
  permiso: PERMISOS_CORE.cumplimientoManage,
  soloPersonas: true,
  input: z.object({
    titular: titularSchema,
    motivo: z.string().trim().min(5).max(500).describe("Por qué se anonimiza (queda en la auditoría)."),
    solicitudId: uuidSchema
      .optional()
      .describe("Solicitud de cancelación abierta que respalda la acción, si existe."),
  }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const t = await cargarTitular(ctx, input.titular);
    // Se valida aquí para la vista previa y de nuevo dentro de la transacción que escribe (§21).
    if (input.solicitudId) await validarSolicitud(ctx.db, input.solicitudId, t.tipo, t.id);
    const tipoT = t.tipo === "persona" ? "persona" : "contacto";
    const base = { titular: { tipo: t.tipo, id: t.id }, documentosVinculados: 0 };
    const docs = await ctx.db.documentoVinculo.count({
      where: { entidadTipo: t.tipo, entidadId: t.id },
    });
    const ahora = new Date();
    let corte: Date | null = null;
    if (t.tipo === "persona") {
      const regla = reglaDe("personas");
      const dias = regla ? await diasDeRegla(ctx, regla) : 0;
      const vinculos = await ctx.db.vinculoLaboral.findMany({
        where: { personaId: t.id },
        select: { estado: true, termino: true },
      });
      const e = elegibilidadPersona(vinculos, dias, ahora);
      if (!e.ok) {
        const motivo = MOTIVOS[e.motivo] ?? "No procede.";
        // La vista previa informa; la escritura real se rechaza (no deja una auditoría de lo no hecho).
        if (!dryRun)
          throw reglaDeNegocio(
            `${motivo}${e.hasta ? ` Procede desde ${e.hasta.toISOString().slice(0, 10)}.` : ""}`,
          );
        return {
          ...base,
          documentosVinculados: docs,
          elegible: false,
          anonimizado: false,
          yaEstabaAnonimizado: false,
          motivo,
          procedeDesde: e.hasta ? e.hasta.toISOString() : null,
        };
      }
      corte = vinculos.length ? fechaCorte(ahora, dias) : null;
    }
    const ya =
      t.tipo === "persona"
        ? (await ctx.db.persona.findUnique({ where: { id: t.id } }))?.anonimizadaEn
        : (await ctx.db.contacto.findUnique({ where: { id: t.id } }))?.anonimizadoEn;
    const previa = { ...base, documentosVinculados: docs, elegible: true, motivo: null, procedeDesde: null };
    if (ya) return { ...previa, anonimizado: false, yaEstabaAnonimizado: true };
    if (dryRun) {
      // La vista previa mira también las otras solicitudes abiertas, como la escritura (§21).
      if ((await solicitudesAbiertas(ctx.db, tipoT, t.id, input.solicitudId)) > 0)
        return { ...previa, elegible: false, motivo: OTRAS, anonimizado: false, yaEstabaAnonimizado: false };
      return { ...previa, anonimizado: false, yaEstabaAnonimizado: false };
    }
    const hecho = await ctx.transaccion(async (tx) => {
      if (input.solicitudId) await validarSolicitud(tx, input.solicitudId, t.tipo, t.id);
      // Otra solicitud abierta (acceso, portabilidad…) quedaría sin datos que entregar: se resuelve antes.
      if ((await solicitudesAbiertas(tx, tipoT, t.id, input.solicitudId)) > 0) throw reglaDeNegocio(OTRAS);
      const ok =
        t.tipo === "persona"
          ? await anonimizarPersona(tx, t.id, ahora, corte)
          : await anonimizarContacto(tx, t.id, ahora, null);
      if (!ok) return false;
      await tx.retencionEjecucion.create({
        data: {
          tenantId: ctx.tenantId,
          tabla: t.tipo === "persona" ? "personas" : "contactos",
          accion: "anonimizar",
          modo: "aplicada",
          origen: "titular",
          filas: 1,
          titularTipo: t.tipo,
          titularId: t.id,
          solicitudId: input.solicitudId ?? null,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.cumplimiento.titular_anonimizado",
        entidadTipo: t.tipo,
        entidadId: t.id,
        payload: { titular: { tipo: t.tipo, id: t.id }, solicitudId: input.solicitudId ?? null },
      });
      return true;
    });
    if (!hecho) throw conflicto("El titular cambió mientras se anonimizaba; vuelve a revisar.");
    return { ...previa, anonimizado: true, yaEstabaAnonimizado: false };
  },
});

import { z } from "zod";

import { conflicto, defineCapability, noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { respuestaValida, type ResultadoRespuesta } from "../domain";
import { uuid } from "./esquemas";
import { personaPropia } from "./persona-propia";

/**
 * Registra la respuesta (aceptada | objetada | vencida) de una corrección: un hecho nuevo, a lo más uno por
 * corrección, con la hora del servidor. Aceptar u objetar solo vale dentro del plazo; objetar exige comentario.
 */
export async function registrarRespuesta(
  ctx: Contexto,
  tx: TenantTx,
  correccionId: string,
  resultado: ResultadoRespuesta | "vencida",
  comentario: string | undefined,
  canal: "portal" | "enlace" | "sistema",
  ahora: Date = new Date(),
) {
  const c = await tx.correccion.findUnique({ where: { id: correccionId } });
  if (!c) throw noEncontrado("La corrección");
  if (await tx.correccionRespuesta.findUnique({ where: { tenantId_correccionId: { tenantId: ctx.tenantId, correccionId } } }))
    throw conflicto("Esta corrección ya fue respondida.");
  if (resultado !== "vencida") {
    if (!respuestaValida({ resultado, comentario })) throw reglaDeNegocio("Para objetar escribe un comentario.");
    if (c.venceEn && ahora.getTime() >= c.venceEn.getTime())
      throw reglaDeNegocio("El plazo para responder esta corrección venció.");
  }
  const fila = await tx.correccionRespuesta.create({
    data: { tenantId: ctx.tenantId, correccionId, resultado, comentario: comentario?.trim() || null, canal, horaServidor: ahora },
  });
  await ctx.bitacora.registrar(tx, {
    tipo: "asistencia.correccion.respondida", entidadTipo: "correccion", entidadId: correccionId,
    payload: { resultado, canal },
  });
  await ctx.eventos.emitir(tx, {
    tipo: "asistencia.correccion.respondida", entidadTipo: "correccion", entidadId: correccionId,
    payload: { correccionId, resultado, canal, personaId: c.personaId },
  });
  return { respuestaId: fila.id, resultado };
}

export const correccionesResponder = defineCapability({
  id: "asistencia.correcciones.responder",
  descripcion:
    "El trabajador acepta u objeta, desde su portal, una corrección propuesta sobre una de sus marcas. Objetar exige un comentario. Es una decisión suya: un agente no responde por un trabajador. Si no responde en el plazo, la corrección se tiene por aceptada.",
  permiso: null,
  portales: ["trabajador", "terreno"],
  soloPersonas: true,
  input: z.object({
    correccionId: uuid,
    resultado: z.enum(["aceptada", "objetada"]),
    comentario: z.string().trim().max(500).optional(),
  }),
  output: z.object({ respuestaId: z.string(), resultado: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const p = await personaPropia(ctx);
    const c = await ctx.db.correccion.findFirst({ where: { id: i.correccionId, personaId: p.id } });
    if (!c) throw noEncontrado("La corrección");
    if (dryRun) {
      if (!respuestaValida(i)) throw reglaDeNegocio("Para objetar escribe un comentario.");
      return { respuestaId: "", resultado: i.resultado };
    }
    return ctx.transaccion((tx) => registrarRespuesta(ctx, tx, c.id, i.resultado, i.comentario, "portal"));
  },
});

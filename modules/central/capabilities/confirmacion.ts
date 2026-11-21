import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { type EstadoConfirmacion, estadoPorRespuesta, puedeResponder, RESPUESTAS_GUARDIA } from "../domain/confirmacion";
import { politicaConfirmacion } from "./confirmacion-politica";
import { uuidSchema } from "./esquemas";
import { PERMISO_ATENDER } from "./esquemas";
import { esTrabajador, personaPropia } from "./mensajes-util";
import { dondeAlcance, ID_VISTA_PREVIA } from "./util";

/** Registra (o reutiliza) la confirmación de un turno esperado y marca el aviso enviado (CAR-752). */
export const confirmacionRegistrar = defineCapability({
  id: "central.confirmacion.registrar",
  descripcion:
    "Abre o actualiza la confirmación de un turno esperado antes de su inicio: fija el plazo de respuesta según la política del tenant o de la instalación y marca que el aviso salió.",
  permiso: PERMISO_ATENDER,
  portales: ["erp", "supervisor"],
  input: z.object({
    turnoEsperadoId: uuidSchema,
    avisoEnviadoEn: z.coerce.date().optional().describe("Hora del aviso; por defecto, ahora."),
  }),
  output: z.object({ id: uuidSchema, turnoEsperadoId: uuidSchema, estado: z.string(), plazoVenceEn: z.date() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const turno = await ctx.db.turnoEsperado.findFirst({
      where: { id: i.turnoEsperadoId, vigente: true, ...dondeAlcance(ctx) },
      select: { id: true, personaId: true, instalacionId: true, inicio: true },
    });
    if (!turno?.personaId) throw noEncontrado("El turno esperado");
    const politica = await politicaConfirmacion(ctx, turno.instalacionId);
    const aviso = i.avisoEnviadoEn ?? new Date();
    const plazo = new Date(aviso.getTime() + politica.plazoRespuestaMin * 60_000);
    if (dryRun) return { id: ID_VISTA_PREVIA, turnoEsperadoId: turno.id, estado: "pendiente", plazoVenceEn: plazo };
    return ctx.transaccion(async (tx) => {
      const previa = await tx.centralConfirmacionTurno.findFirst({ where: { turnoEsperadoId: turno.id } });
      if (previa) {
        const actual = await tx.centralConfirmacionTurno.update({
          where: { id: previa.id },
          data: { avisoEnviadoEn: aviso, plazoVenceEn: plazo, estado: previa.estado === "sin_respuesta" ? "pendiente" : previa.estado },
        });
        return { id: actual.id, turnoEsperadoId: turno.id, estado: actual.estado, plazoVenceEn: plazo };
      }
      const creada = await tx.centralConfirmacionTurno.create({
        data: {
          tenantId: ctx.tenantId,
          turnoEsperadoId: turno.id,
          personaId: turno.personaId,
          instalacionId: turno.instalacionId,
          avisoEnviadoEn: aviso,
          plazoVenceEn: plazo,
        },
      });
      return { id: creada.id, turnoEsperadoId: turno.id, estado: creada.estado, plazoVenceEn: plazo };
    });
  },
});

/** El guardia responde Confirmo, Voy en camino o Tengo un problema; la última respuesta cuenta. */
export const confirmacionResponder = defineCapability({
  id: "central.confirmacion.responder",
  descripcion:
    "Registra la respuesta del guardia a la confirmación de su turno. «Tengo un problema» exige un motivo corto.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador"],
  input: z.object({
    id: uuidSchema.optional(),
    turnoEsperadoId: uuidSchema.optional(),
    respuesta: z.enum(RESPUESTAS_GUARDIA),
    motivo: z.string().trim().max(200).optional(),
  }),
  output: z.object({ id: uuidSchema, estado: z.string(), respondidoEn: z.date() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (!i.id && !i.turnoEsperadoId) throw reglaDeNegocio("Indica la confirmación o el turno esperado.");
    const filtro = i.id ? { id: i.id } : { turnoEsperadoId: i.turnoEsperadoId! };
    const fila = await ctx.db.centralConfirmacionTurno.findFirst({ where: { ...filtro, ...dondeAlcance(ctx) } });
    if (!fila) throw noEncontrado("La confirmación");
    if (esTrabajador(ctx)) {
      const propia = await personaPropia(ctx);
      if (fila.personaId !== propia.id) throw noEncontrado("La confirmación");
    } else if (!ctx.autorizar(PERMISO_ATENDER)) {
      throw reglaDeNegocio("Responder por otro guardia exige el permiso central:alertas.atender.");
    }
    const turno = await ctx.db.turnoEsperado.findFirst({
      where: { id: fila.turnoEsperadoId, vigente: true },
      select: { inicio: true },
    });
    if (!turno) throw noEncontrado("El turno esperado");
    if (!puedeResponder(fila.estado as EstadoConfirmacion, turno.inicio)) {
      throw reglaDeNegocio("Esta confirmación ya no admite respuesta.");
    }
    const estado = estadoPorRespuesta(i.respuesta, i.motivo);
    if (!estado) throw reglaDeNegocio("Motivo obligatorio y de hasta 200 caracteres si tienes un problema.");
    const respondidoEn = new Date();
    if (dryRun) return { id: fila.id, estado, respondidoEn };
    const actual = await ctx.db.centralConfirmacionTurno.update({
      where: { id: fila.id },
      data: { estado, motivo: estado === "con_problema" ? i.motivo!.trim() : null, respondidoEn },
    });
    return { id: actual.id, estado: actual.estado, respondidoEn };
  },
});
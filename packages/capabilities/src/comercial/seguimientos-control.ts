// Control del seguimiento (CAR-67): pausar, reanudar con nuevas fechas hábiles, cancelar y «el cliente respondió».
import { z } from "zod";

import { proximoMomento, transicionSeguimiento } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISO_MANAGE } from "./comun";
import { aplicarRespuesta } from "./seguimiento-ejecucion";
import { ambitoHabil, configDeVersion, seguimientoPorId, seguimientoVistaSchema, zonaDe } from "./seguimiento-comun";

async function vivo(ctx: Parameters<typeof zonaDe>[0], id: string) {
  const s = await ctx.db.seguimiento.findUnique({ where: { id } });
  if (!s) throw noEncontrado("El seguimiento");
  return s;
}

export const seguimientosControlar = defineCapability({
  id: "comercial.seguimientos.controlar",
  descripcion:
    "Pausa, reanuda o cancela el seguimiento de un negocio. Al reanudar, los pasos vencidos pendientes se reprograman al próximo día hábil; al cancelar, los pasos pendientes quedan cancelados y queda el motivo.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    id: uuidSchema,
    accion: z.enum(["pausar", "reanudar", "cancelar"]),
    motivo: z.string().trim().max(300).optional(),
  }),
  output: seguimientoVistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const s = await vivo(ctx, input.id);
    const destino = transicionSeguimiento(s.estado as Parameters<typeof transicionSeguimiento>[0], input.accion);
    if (!destino) throw reglaDeNegocio(`Un seguimiento ${s.estado} no admite «${input.accion}».`);
    if (dryRun) return { ...(await seguimientoPorId(ctx, s.id)), estado: destino };
    const config = await configDeVersion(ctx, s.planId, s.planVersion);
    const ahora = new Date();
    const siguiente = input.accion === "reanudar" ? proximoMomento(ahora, config.hora, config.conteo, await ambitoHabil(ctx, ahora), await zonaDe(ctx)) : null;
    await ctx.transaccion(async (tx) => {
      await tx.seguimiento.update({ where: { id: s.id }, data: { estado: destino, motivo: input.accion === "reanudar" ? null : (input.motivo ?? "manual") } });
      if (input.accion === "cancelar")
        await tx.seguimientoPaso.updateMany({ where: { seguimientoId: s.id, estado: { in: ["programado", "por_hacer", "por_preparar"] } }, data: { estado: "cancelado" } });
      if (siguiente)
        await tx.seguimientoPaso.updateMany({ where: { seguimientoId: s.id, estado: "programado", programadoEn: { lt: siguiente } }, data: { programadoEn: siguiente } });
      await ctx.eventos.emitir(tx, { tipo: `comercial.seguimiento.${destino === "activo" ? "reanudado" : destino}`, entidadTipo: "negocio", entidadId: s.negocioId, payload: { seguimientoId: s.id } });
    });
    return seguimientoPorId(ctx, s.id);
  },
});

export const seguimientosRegistrarRespuesta = defineCapability({
  id: "comercial.seguimientos.registrar_respuesta",
  descripcion:
    "Registra que el cliente respondió (por teléfono, WhatsApp u otro medio): según el plan pausa o detiene el seguimiento y deja una nota en el negocio. Es la acción manual «El cliente respondió».",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema, detalle: z.string().trim().max(1000).optional().describe("Qué dijo el cliente, en palabras de quien lo registra.") }),
  output: seguimientoVistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const s = await vivo(ctx, input.id);
    if (s.estado !== "activo" && s.estado !== "pausado") throw reglaDeNegocio("El seguimiento ya terminó.");
    const config = await configDeVersion(ctx, s.planId, s.planVersion);
    if (dryRun) return { ...(await seguimientoPorId(ctx, s.id)), estado: config.alResponder === "detener" ? "cancelado" : "pausado" };
    await ctx.transaccion((tx) => aplicarRespuesta(ctx, tx, s, config, { titulo: "El cliente respondió", detalle: input.detalle ?? null }));
    return seguimientoPorId(ctx, s.id);
  },
});

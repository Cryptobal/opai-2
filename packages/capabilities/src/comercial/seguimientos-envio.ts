// Decisión de seguimiento al enviar una cotización (R4 de la spec, piso de 1.0, CAR-160): iniciar el
// plan, mover el negocio a una etapa abierta sin seguimiento o solo enviar. Pantalla y MCP usan el mismo
// parámetro `opcion`. La etapa la elige la persona (por id): no hay etapa por defecto.
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { PERMISO_MANAGE, etapaDe, negocioDe } from "./comun";
import { seguimientoPorId, seguimientoVistaSchema } from "./seguimiento-comun";
import { PASOS_CANCELABLES, cancelarPasosPendientes } from "./seguimiento-tareas";
import { iniciarSeguimiento } from "./seguimientos-iniciar";
import { aplicarEtapa } from "./transiciones-util";
import { validarEntrada } from "./validaciones";

const OPCIONES = ["iniciar", "mover_sin_seguimiento", "solo_enviar"] as const;

const salida = z.object({
  opcion: z.enum(OPCIONES),
  seguimiento: seguimientoVistaSchema.nullable().describe("El seguimiento que queda (nuevo al iniciar; el vigente al solo enviar)."),
  etapaId: z.string().nullable().describe("Etapa en que queda el negocio."),
  movido: z.boolean().describe("Si el negocio cambió de etapa. Nunca baja: si ya está más adelante, queda donde está."),
  pasosCancelados: z.number().describe("Pasos pendientes del seguimiento anterior que se cancelan."),
  etapasAbiertas: z.array(z.object({ id: z.string(), nombre: z.string(), actual: z.boolean() }))
    .describe("Etapas abiertas del embudo del negocio, en orden, para elegir al mover sin seguimiento."),
});

async function contexto(ctx: Contexto, negocioId: string) {
  const negocio = await negocioDe(ctx, negocioId);
  const [etapas, vivo] = await Promise.all([
    ctx.db.etapa.findMany({ where: { embudoId: negocio.embudoId, activa: true, tipo: "abierta" }, orderBy: { orden: "asc" } }),
    ctx.db.seguimiento.findFirst({ where: { negocioId, estado: { in: ["activo", "pausado"] } } }),
  ]);
  const pendientes = vivo ? await ctx.db.seguimientoPaso.count({ where: { seguimientoId: vivo.id, estado: { in: PASOS_CANCELABLES } } }) : 0;
  const etapasAbiertas = etapas.map((e) => ({ id: e.id, nombre: e.nombre, actual: e.id === negocio.etapaId }));
  return { negocio, vivo, pendientes, etapasAbiertas };
}

export const seguimientosDecidirEnvio = defineCapability({
  id: "comercial.seguimientos.decidir_envio",
  descripcion:
    "Al enviar una cotización, decide el seguimiento del negocio: «iniciar» agenda el plan (reemplaza el vigente), «mover_sin_seguimiento» pasa el negocio a la etapa abierta elegida (nunca lo baja) y cancela los pasos pendientes, y «solo_enviar» no cambia nada. La vista previa dice cuántos pasos se cancelan.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    negocioId: uuidSchema,
    opcion: z.enum(OPCIONES),
    etapaId: uuidSchema.optional().describe("Obligatoria al mover sin seguimiento: etapa abierta (id) del embudo del negocio."),
    planId: uuidSchema.optional().describe("Solo al iniciar; por defecto, el plan por defecto de la empresa."),
    cotizacionId: uuidSchema.optional(),
    cotizacionCodigo: z.string().max(40).optional(),
  }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { negocio, vivo, pendientes, etapasAbiertas } = await contexto(ctx, input.negocioId);
    if (negocio.estado !== "abierto") throw reglaDeNegocio("El negocio está cerrado: no se decide seguimiento al enviar.");
    const base = { opcion: input.opcion, etapasAbiertas, etapaId: negocio.etapaId, movido: false };
    if (input.opcion === "solo_enviar")
      return { ...base, seguimiento: vivo ? await seguimientoPorId(ctx, vivo.id) : null, pasosCancelados: 0 };
    if (input.opcion === "iniciar") {
      const { opcion: _o, etapaId: _e, ...resto } = input;
      const seguimiento = await iniciarSeguimiento(ctx, { ...resto, reemplazar: true }, dryRun);
      return { ...base, seguimiento, pasosCancelados: pendientes };
    }
    if (!input.etapaId) {
      if (dryRun) return { ...base, seguimiento: null, pasosCancelados: pendientes };
      throw reglaDeNegocio("Elige la etapa a la que pasa el negocio.");
    }
    const destino = await etapaDe(ctx, input.etapaId);
    if (destino.embudoId !== negocio.embudoId || !destino.activa) throw reglaDeNegocio("La etapa no pertenece al embudo del negocio.");
    if (destino.tipo !== "abierta") throw reglaDeNegocio("Elige una etapa abierta: ganar y perder van en sus propias acciones.");
    // Nunca baja: el envío de CPQ puede haber movido el negocio («Propuesta enviada») después de que la
    // hoja calculó las etapas; un destino anterior al actual deja el negocio donde está.
    const actual = await etapaDe(ctx, negocio.etapaId);
    const mover = destino.orden > actual.orden;
    if (mover) await validarEntrada(ctx, negocio, destino);
    if (dryRun) return { ...base, etapaId: mover ? destino.id : actual.id, movido: mover, seguimiento: null, pasosCancelados: pendientes };
    const cancelados = await ctx.transaccion(async (tx) => {
      let n = 0;
      // Condicional: si otro proceso ya lo terminó (ganado, perdido), no se pisa su motivo.
      const r = vivo
        ? await tx.seguimiento.updateMany({ where: { id: vivo.id, estado: { in: ["activo", "pausado"] } }, data: { estado: "cancelado", motivo: "manual", motivoDetalle: "Cotización enviada y negocio movido sin seguimiento." } })
        : { count: 0 };
      if (vivo && r.count) {
        n = await cancelarPasosPendientes(ctx, tx, vivo.id);
        await ctx.eventos.emitir(tx, { tipo: "comercial.seguimiento.cancelado", entidadTipo: "negocio", entidadId: negocio.id, payload: { seguimientoId: vivo.id } });
      }
      if (mover) await aplicarEtapa(ctx, tx, negocio, destino, { evento: "comercial.negocio.etapa_cambiada", motivo: "Cotización enviada sin seguimiento" });
      return n;
    });
    return { ...base, etapaId: mover ? destino.id : actual.id, movido: mover, seguimiento: null, pasosCancelados: cancelados };
  },
});

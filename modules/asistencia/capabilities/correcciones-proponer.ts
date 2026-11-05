import { randomUUID } from "node:crypto";
import { z } from "zod";

import { ajuste, conflicto, defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";
import { avanzarCadena, bloquearCadena } from "@opai/db";

import { hashDeCorreccion, TIPOS_MARCA, venceEn } from "../domain";
import { uuid } from "./esquemas";
import { usuarioId } from "./usuario";

export const correccionesProponer = defineCapability({
  id: "asistencia.correcciones.proponer",
  descripcion:
    "Propone corregir una marca de asistencia (RR. HH. o el supervisor de esa instalación), con motivo. Nunca borra el original: la corrección es un hecho nuevo encadenado. El trabajador recibe un aviso con un enlace para aceptar u objetar dentro del plazo (48 h por defecto, un parámetro de la empresa); mientras está pendiente, los reportes y los días usan el valor original.",
  permiso: "asistencia:corregir",
  input: z.object({
    marcaId: uuid,
    horaPropuesta: z.string().datetime(),
    tipoPropuesto: z.enum(TIPOS_MARCA),
    motivo: z.string().trim().min(5).max(500),
  }),
  output: z.object({ correccionId: z.string(), seq: z.number().int(), venceEn: z.string(), hash: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun, idempotencyKey }) {
    const alcance = ctx.alcance ? { instalacionId: { in: [...ctx.alcance.instalaciones] } } : {};
    const marca = await ctx.db.marca.findFirst({ where: { id: i.marcaId, ...alcance } });
    if (!marca) throw noEncontrado("La marca");
    const pendiente = await ctx.db.correccion.findMany({ where: { marcaId: marca.id }, select: { id: true } });
    if (pendiente.length) {
      const respondidas = await ctx.db.correccionRespuesta.count({
        where: { correccionId: { in: pendiente.map((c) => c.id) } },
      });
      if (respondidas < pendiente.length) throw conflicto("Esta marca ya tiene una corrección pendiente de respuesta.");
    }
    const horaPropuesta = new Date(i.horaPropuesta);
    if (Math.abs(horaPropuesta.getTime() - marca.horaServidor.getTime()) > 3 * 86_400_000)
      throw reglaDeNegocio("La hora propuesta debe estar a menos de 3 días de la marca original.");
    const plazoHoras = await ajuste<number>(ctx, "asistencia", "plazo_correccion_horas");
    const ahora = new Date();
    const vence = venceEn(ahora, plazoHoras);
    if (dryRun) return { correccionId: "", seq: 0, venceEn: vence.toISOString(), hash: "" };
    const clave = idempotencyKey ?? randomUUID();
    return ctx.transaccion(async (tx) => {
      const { siguienteSeq, hashAnterior } = await bloquearCadena(tx, ctx.tenantId, "correcciones");
      const registro = {
        tenantId: ctx.tenantId, seq: siguienteSeq, marcaId: marca.id, personaId: marca.personaId,
        horaPropuesta, tipoPropuesto: i.tipoPropuesto, motivo: i.motivo, propuestaPorId: usuarioId(ctx),
        horaServidor: ahora, plazoHoras, venceEn: vence, idempotencyKey: clave,
      };
      const hash = await hashDeCorreccion(hashAnterior, registro);
      const fila = await tx.correccion.create({ data: { ...registro, hash, hashAnterior } });
      await avanzarCadena(tx, ctx.tenantId, "correcciones", siguienteSeq, hash);
      await ctx.bitacora.registrar(tx, {
        tipo: "asistencia.correccion.propuesta", entidadTipo: "correccion", entidadId: fila.id,
        payload: { seq: siguienteSeq, marcaId: marca.id, hash },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "asistencia.correccion.propuesta", entidadTipo: "correccion", entidadId: fila.id,
        payload: { correccionId: fila.id, marcaId: marca.id, personaId: marca.personaId },
      });
      return { correccionId: fila.id, seq: siguienteSeq, venceEn: vence.toISOString(), hash };
    });
  },
});

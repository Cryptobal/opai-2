import { ESTADOS_ACTIVO, ETIQUETA_ESTADO_ACTIVO, transicionManualPermitida, type EstadoActivo } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import { activoSchema, vistaActivo } from "./activos-comun";
import { PERMISOS_INVENTARIO } from "./comun";

const ESTADOS_MANUALES = ["disponible", "en_reparacion", "de_baja"] as const;

/**
 * R12: cambia el estado de un activo a mano (a reparación, de vuelta a disponible o de baja). Dar de
 * baja pide motivo y no tiene vuelta atrás, así que a un agente le pide aprobación humana.
 */
export const activosCambiarEstado = defineCapability({
  id: "inventario.activos.cambiar_estado",
  descripcion:
    "Cambia el estado de un activo: enviarlo a reparación, devolverlo a disponible o darlo de baja con un motivo (por ejemplo, perdido o dañado). Dar de baja no se puede deshacer. Un activo asignado se devuelve primero.",
  permiso: PERMISOS_INVENTARIO.gestionar,
  input: z.object({
    id: uuidSchema,
    estado: z.enum(ESTADOS_MANUALES),
    motivo: z.string().trim().min(3).max(300).optional().describe("Obligatorio al dar de baja."),
  }),
  output: activoSchema,
  efecto: "escritura",
  dryRun: true,
  exigeAprobacion: (input) => input.estado === "de_baja",
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.inventarioActivo.findFirst({ where: { id: input.id } });
    if (!actual) throw noEncontrado("El activo");
    const desde: EstadoActivo = ESTADOS_ACTIVO.find((e) => e === actual.estado) ?? "disponible";
    if (!transicionManualPermitida(desde, input.estado)) {
      throw reglaDeNegocio(
        `No se puede pasar de «${ETIQUETA_ESTADO_ACTIVO[desde]}» a «${ETIQUETA_ESTADO_ACTIVO[input.estado]}».`,
      );
    }
    if (input.estado === "de_baja" && !input.motivo) throw reglaDeNegocio("Indica el motivo de la baja.");
    const baja = input.estado === "de_baja";
    const data = {
      estado: input.estado,
      bajaEn: baja ? new Date() : null,
      motivoBaja: baja ? (input.motivo ?? null) : null,
    };
    const tipo = await ctx.db.inventarioTipo.findFirst({ where: { id: actual.tipoId }, select: { nombre: true } });
    if (dryRun) return vistaActivo({ ...actual, ...data }, tipo?.nombre ?? "");
    const guardado = await ctx.transaccion(async (tx) => {
      // Solo si sigue en el estado leído: dos cambios a la vez no se pisan.
      const r = await tx.inventarioActivo.updateMany({ where: { id: actual.id, estado: actual.estado }, data });
      if (r.count !== 1) throw conflicto("El activo cambió mientras tanto. Vuelve a cargarlo.");
      await ctx.eventos.emitir(tx, {
        tipo: "inventario.activo.estado_cambiado",
        entidadTipo: "inventario_activo",
        entidadId: actual.id,
        payload: { desde, hacia: input.estado },
      });
      return tx.inventarioActivo.findFirstOrThrow({ where: { id: actual.id } });
    });
    return vistaActivo(guardado, tipo?.nombre ?? "");
  },
});

import { z } from "zod";

import {
  ACCIONES_NOVEDAD_LIBRO,
  PERMISOS_CORE,
  accionesNovedad,
  siguienteEstadoNovedad,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, reglaDeNegocio } from "../../errores";
import { externo } from "../../externo";
import { uuidSchema } from "../esquemas";
import { quien } from "./comun";
import { iso } from "./hechos-comun";
import {
  estadoNovedadSchema,
  novedadEnAlcance,
  novedadSchema,
  vistaNovedad,
} from "./libro-novedades-comun";

const accionSchema = z.enum(ACCIONES_NOVEDAD_LIBRO);

/**
 * Cambia el estado de una novedad del libro (CAR-77 parte 2). El cambio es un hecho nuevo e inmutable con autor y
 * nota; el estado de la novedad se actualiza en la misma transacción solo si sigue siendo el leído, para que dos
 * personas a la vez no partan del mismo estado (la segunda recibe el motivo con el estado nuevo).
 */
export const libroNovedadesCambiarEstado = defineCapability({
  id: "core.libro_novedades.cambiar_estado",
  descripcion:
    "Cambia el estado de una novedad del libro: tomarla (en atención), resolverla, cerrarla (después de resuelta), derivarla o reabrirla. Deja el cambio con autor, nota y hora; una novedad cerrada ya no cambia.",
  permiso: PERMISOS_CORE.novedadesManage,
  input: z.object({
    novedadId: uuidSchema,
    accion: accionSchema,
    nota: z.string().trim().max(1000).optional(),
  }),
  output: z.object({ aplicado: z.boolean(), novedad: novedadSchema }),
  efecto: "escritura",
  dryRun: true,
  auditoriaPayload: (_ctx, e) => ({ novedadId: e.novedadId, accion: e.accion }),
  async handler(ctx, e, { dryRun }) {
    const actual = await novedadEnAlcance(ctx, e.novedadId);
    const motivo = (desde: string) =>
      reglaDeNegocio(`No se puede «${e.accion}» una novedad ${desde.replace("_", " ")}.`, {
        disponibles: accionesNovedad(estadoNovedadSchema.parse(desde)),
      });
    const previsto = siguienteEstadoNovedad(estadoNovedadSchema.parse(actual.estado), e.accion);
    if (!previsto) throw motivo(actual.estado);
    if (dryRun) return { aplicado: false, novedad: { ...vistaNovedad(actual), estado: previsto } };
    const n = await ctx.transaccion(async (tx) => {
      const fila = await tx.libroNovedad.findUniqueOrThrow({ where: { id: e.novedadId } });
      const desde = estadoNovedadSchema.parse(fila.estado);
      const hacia = siguienteEstadoNovedad(desde, e.accion);
      if (!hacia) throw motivo(desde);
      const { count } = await tx.libroNovedad.updateMany({
        where: { id: fila.id, estado: desde },
        data: { estado: hacia },
      });
      if (count !== 1) throw conflicto("La novedad cambió mientras tanto; vuelve a abrirla.");
      await tx.libroNovedadHecho.create({
        data: {
          tenantId: ctx.tenantId,
          novedadId: fila.id,
          accion: e.accion,
          estadoAnterior: desde,
          estadoNuevo: hacia,
          nota: e.nota ?? null,
          usuarioId: quien(ctx),
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.libro_novedades.estado_cambiado",
        entidadTipo: "libro_novedad",
        entidadId: fila.id,
        payload: { instalacionId: fila.instalacionId, numero: fila.numero, desde, hacia },
      });
      return { ...fila, estado: hacia };
    });
    return { aplicado: true, novedad: vistaNovedad(n) };
  },
});

/** Una novedad con su historia de estados (detalle del libro). */
export const libroNovedadesObtener = defineCapability({
  id: "core.libro_novedades.obtener",
  descripcion:
    "Muestra una novedad del libro con su historia: cada cambio de estado con la acción, el estado anterior y el nuevo, la nota, quién y cuándo; y las acciones que se pueden hacer ahora.",
  permiso: PERMISOS_CORE.instalacionesRead,
  input: z.object({ novedadId: uuidSchema }),
  output: z.object({
    novedad: novedadSchema,
    acciones: z.array(accionSchema),
    historia: z.array(
      z.object({
        id: z.string(),
        accion: accionSchema,
        estadoAnterior: estadoNovedadSchema,
        estadoNuevo: estadoNovedadSchema,
        nota: externo(z.string().nullable()),
        usuarioId: z.string().nullable(),
        en: z.string(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.novedad.id],
  async handler(ctx, { novedadId }) {
    const n = await novedadEnAlcance(ctx, novedadId);
    const hechos = await ctx.db.libroNovedadHecho.findMany({
      where: { novedadId: n.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 200,
    });
    return {
      novedad: vistaNovedad(n),
      acciones: accionesNovedad(estadoNovedadSchema.parse(n.estado)),
      historia: hechos.map((h) => ({
        id: h.id,
        accion: accionSchema.parse(h.accion),
        estadoAnterior: estadoNovedadSchema.parse(h.estadoAnterior),
        estadoNuevo: estadoNovedadSchema.parse(h.estadoNuevo),
        nota: h.nota,
        usuarioId: h.usuarioId,
        en: iso(h.createdAt),
      })),
    };
  },
});

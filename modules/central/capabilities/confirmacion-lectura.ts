import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { ESTADOS_CONFIRMACION } from "../domain/confirmacion";
import { cursorDe, listaSchema, pagina, PERMISO_VER, uuidSchema } from "./esquemas";
import { esTrabajador, personaPropia } from "./mensajes-util";
import { dondeAlcance } from "./util";
import { politicaConfirmacion } from "./confirmacion-politica";

const filaSchema = z.object({
  id: uuidSchema,
  turnoEsperadoId: uuidSchema,
  personaId: uuidSchema,
  instalacionId: uuidSchema,
  estado: z.enum(ESTADOS_CONFIRMACION),
  motivo: z.string().nullable(),
  avisoEnviadoEn: z.date().nullable(),
  plazoVenceEn: z.date().nullable(),
  respondidoEn: z.date().nullable(),
  turnoInicio: z.date().describe("Inicio del turno esperado vinculado."),
  createdAt: z.date(),
});

/** Confirmaciones por instalación y ventana de inicio de turno (panel «próxima hora», CAR-752+). */
export const confirmacionListar = defineCapability({
  auditarLectura: (s) => s.items.flatMap((f) => [f.id, f.personaId]),
  id: "central.confirmacion.listar",
  descripcion:
    "Lista confirmaciones de turno por instalación y rango de inicio del turno, de la más próxima a la más lejana.",
  permiso: PERMISO_VER,
  input: listaSchema.extend({
    instalacionId: uuidSchema.optional(),
    desde: z.coerce.date().optional(),
    hasta: z.coerce.date().optional(),
  }),
  output: z.object({ items: z.array(filaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    if (esTrabajador(ctx)) throw noEncontrado("La confirmación");
    const turnos = await ctx.db.turnoEsperado.findMany({
      where: {
        vigente: true,
        ...(i.instalacionId ? { instalacionId: i.instalacionId } : {}),
        inicio: { ...(i.desde ? { gte: i.desde } : {}), ...(i.hasta ? { lte: i.hasta } : {}) },
      },
      select: { id: true, inicio: true, instalacionId: true },
      orderBy: { inicio: "asc" },
    });
    const insts = ctx.alcance ? new Set(ctx.alcance.instalaciones) : null;
    const turnoIds = turnos.filter((t) => !insts || insts.has(t.instalacionId)).map((t) => t.id);
    if (turnoIds.length === 0) return { items: [], siguiente: null };
    const filas = await ctx.db.centralConfirmacionTurno.findMany({
      where: {
        turnoEsperadoId: { in: turnoIds },
        ...dondeAlcance(ctx),
      },
      orderBy: { id: "asc" },
      ...cursorDe(i.cursor, i.limite),
    });
    const pag = pagina(filas, i.limite, i.cursor);
    const inicios = new Map(
      (
        await ctx.db.turnoEsperado.findMany({
          where: { id: { in: pag.items.map((f) => f.turnoEsperadoId) }, vigente: true },
          select: { id: true, inicio: true },
        })
      ).map((t) => [t.id, t.inicio] as const),
    );
    return {
      siguiente: pag.siguiente,
      items: pag.items
        .map((f) => {
          const turnoInicio = inicios.get(f.turnoEsperadoId);
          if (!turnoInicio) return null;
          return {
            id: f.id,
            turnoEsperadoId: f.turnoEsperadoId,
            personaId: f.personaId,
            instalacionId: f.instalacionId,
            estado: f.estado as (typeof ESTADOS_CONFIRMACION)[number],
            motivo: f.motivo,
            avisoEnviadoEn: f.avisoEnviadoEn,
            plazoVenceEn: f.plazoVenceEn,
            respondidoEn: f.respondidoEn,
            turnoInicio,
            createdAt: f.createdAt,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null),
    };
  },
});

export const confirmacionObtener = defineCapability({
  auditarLectura: (s) => [s.id, s.personaId],
  id: "central.confirmacion.obtener",
  descripcion: "Devuelve una confirmación de turno con el inicio del turno esperado.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador"],
  input: z.object({ id: uuidSchema.optional(), turnoEsperadoId: uuidSchema.optional() }),
  output: filaSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    if (!i.id && !i.turnoEsperadoId) throw noEncontrado("La confirmación");
    const filtro = i.id ? { id: i.id } : { turnoEsperadoId: i.turnoEsperadoId! };
    const fila = await ctx.db.centralConfirmacionTurno.findFirst({
      where: { ...filtro, ...dondeAlcance(ctx) },
    });
    if (!fila) throw noEncontrado("La confirmación");
    if (esTrabajador(ctx)) {
      const propia = await personaPropia(ctx);
      if (fila.personaId !== propia.id) throw noEncontrado("La confirmación");
    } else if (!ctx.autorizar(PERMISO_VER)) throw noEncontrado("La confirmación");
    const turno = await ctx.db.turnoEsperado.findFirst({
      where: { id: fila.turnoEsperadoId, vigente: true },
      select: { inicio: true },
    });
    if (!turno) throw noEncontrado("El turno esperado");
    return {
      id: fila.id,
      turnoEsperadoId: fila.turnoEsperadoId,
      personaId: fila.personaId,
      instalacionId: fila.instalacionId,
      estado: fila.estado as (typeof ESTADOS_CONFIRMACION)[number],
      motivo: fila.motivo,
      avisoEnviadoEn: fila.avisoEnviadoEn,
      plazoVenceEn: fila.plazoVenceEn,
      respondidoEn: fila.respondidoEn,
      turnoInicio: turno.inicio,
      createdAt: fila.createdAt,
    };
  },
});

export const confirmacionPoliticaObtener = defineCapability({
  auditarLectura: (s) => [s.instalacionId],
  id: "central.confirmacion.politica_obtener",
  descripcion: "Lee la política efectiva de confirmación de turno para una instalación.",
  permiso: PERMISO_VER,
  input: z.object({ instalacionId: uuidSchema }),
  output: z.object({
    instalacionId: uuidSchema,
    anticipacionMin: z.number().int(),
    plazoRespuestaMin: z.number().int(),
    franja: z.enum(["noche", "dia", "ambos"]),
  }),
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, i) => politicaConfirmacion(ctx, i.instalacionId),
});
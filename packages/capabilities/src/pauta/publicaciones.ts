import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondeInstalacion } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { PERMISO_READ, PERMISO_WRITE } from "./comun";
import { planearPublicacion, publicacionInput } from "./publicar-plan";

const salidaPublicar = z.object({
  instalacionId: uuidSchema,
  instalacion: z.string(),
  mes: z.string(),
  personas: z.number().int().describe("Titulares con turnos en el mes."),
  conUsuario: z
    .number()
    .int()
    .describe("De ellos, con usuario en OPAI: reciben el aviso en su portal."),
  turnos: z.number().int().describe("Turnos del mes entre todos los titulares."),
  publicadaAntes: z
    .string()
    .nullable()
    .describe("Cuándo se publicó antes este mes (ISO), si ya estaba publicado."),
  publicadaEn: z
    .string()
    .nullable()
    .describe("Cuándo quedó publicada (ISO); nula en la vista previa."),
});

/**
 * Publica la pauta de una instalación en un mes (CAR-356, decisión de Carlos del 13-nov-2026): queda registrado quién
 * y cuándo, y cada titular con usuario recibe en la campana de su portal el aviso con sus turnos (consumidor
 * `pauta.publicada.avisar`). La pauta rige igual sin publicar; republicar vuelve a avisar.
 */
export const publicacionesPublicar = defineCapability({
  id: "pauta.publicaciones.publicar",
  descripcion:
    "Publica la pauta de una instalación para un mes y avisa a cada guardia titular sus turnos en la campana de su portal del trabajador. La vista previa dice a cuántas personas y turnos alcanza. Republicar un mes ya publicado vuelve a avisar.",
  permiso: PERMISO_WRITE,
  input: publicacionInput,
  output: salidaPublicar,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { instalacion, personas } = await planearPublicacion(ctx, input);
    const conUsuario = personas.length
      ? await ctx.db.persona.count({
          where: { id: { in: personas.map((p) => p.personaId) }, usuarioId: { not: null } },
        })
      : 0;
    const previa = await ctx.db.publicacionPauta.findFirst({
      where: { instalacionId: instalacion.id, mes: input.mes },
      select: { publicadaEn: true },
    });
    const base = {
      instalacionId: instalacion.id,
      instalacion: instalacion.nombre,
      mes: input.mes,
      personas: personas.length,
      conUsuario,
      turnos: personas.reduce((n, p) => n + p.dias.length, 0),
      publicadaAntes: previa?.publicadaEn.toISOString() ?? null,
    };
    if (dryRun) return { ...base, publicadaEn: null };
    const ahora = new Date();
    return ctx.transaccion(async (tx) => {
      const fila = await tx.publicacionPauta.upsert({
        where: {
          tenantId_instalacionId_mes: {
            tenantId: ctx.tenantId,
            instalacionId: instalacion.id,
            mes: input.mes,
          },
        },
        create: {
          tenantId: ctx.tenantId,
          instalacionId: instalacion.id,
          mes: input.mes,
          publicadaEn: ahora,
          publicadaPor: ctx.usuario?.id ?? null,
          avisados: conUsuario,
        },
        update: { publicadaEn: ahora, publicadaPor: ctx.usuario?.id ?? null, avisados: conUsuario },
        select: { id: true, publicadaEn: true },
      });
      // Solo IDs y fechas en el evento: el consumidor arma el texto con los nombres al avisar.
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.publicada",
        entidadTipo: "instalacion",
        entidadId: instalacion.id,
        payload: {
          publicacionId: fila.id,
          instalacionId: instalacion.id,
          mes: input.mes,
          personas,
        },
      });
      return { ...base, publicadaEn: fila.publicadaEn.toISOString() };
    });
  },
});

/** Qué instalaciones tienen publicada la pauta de un mes (para el botón «Publicar» y su estado). */
export const publicacionesListar = defineCapability({
  id: "pauta.publicaciones.listar",
  descripcion:
    "Lista, para un mes, las instalaciones cuya pauta ya se publicó, con cuándo y a cuántas personas se avisó. Solo instalaciones dentro del alcance de quien consulta.",
  permiso: PERMISO_READ,
  input: z.object({ mes: publicacionInput.shape.mes }),
  output: z.object({
    publicaciones: z.array(
      z.object({ instalacionId: uuidSchema, publicadaEn: z.string(), avisados: z.number().int() }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { mes }) {
    const visibles = await ctx.db.instalacion.findMany({
      where: { AND: [dondeInstalacion(ctx)] },
      select: { id: true },
    });
    const filas = await ctx.db.publicacionPauta.findMany({
      where: { mes, instalacionId: { in: visibles.map((v) => v.id) } },
      select: { instalacionId: true, publicadaEn: true, avisados: true },
      orderBy: { instalacionId: "asc" },
    });
    return {
      publicaciones: filas.map((f) => ({
        instalacionId: f.instalacionId,
        publicadaEn: f.publicadaEn.toISOString(),
        avisados: f.avisados,
      })),
    };
  },
});

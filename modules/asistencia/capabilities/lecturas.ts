import { z } from "zod";

import { defineCapability, noEncontrado, prohibido, type Contexto } from "@opai/capabilities";

import { marcaVistaSchema, uuid, vistaDeMarca } from "./esquemas";
import { personaPropia } from "./persona-propia";

const PORTALES = ["erp", "supervisor", "trabajador", "terreno"] as const;
const dePersona = (ctx: Contexto) => ctx.portal === "trabajador" || ctx.portal === "terreno";

/**
 * Filtro de filas (ADR-022): el trabajador ve solo lo propio; quien tiene `asistencia:ver` ve lo de las
 * instalaciones a su cargo (el supervisor) o de toda la empresa (alcance nulo). Se aplica en la consulta.
 */
async function alcanceMarcas(ctx: Contexto): Promise<{ personaId?: string; instalacionId?: { in: string[] } }> {
  if (dePersona(ctx)) return { personaId: (await personaPropia(ctx)).id };
  if (!ctx.autorizar("asistencia:ver")) throw prohibido("Ver marcas exige el permiso asistencia:ver.");
  return ctx.alcance ? { instalacionId: { in: [...ctx.alcance.instalaciones] } } : {};
}

const fechaIso = z.string().datetime();
const MAX_DIAS = 62;
const LIMITE = 200;

export const marcasListar = defineCapability({
  id: "asistencia.marcas.listar",
  descripcion:
    "Lista las marcas legales de asistencia en un rango de fechas, de una persona o una instalación, con su tipo, hora del servidor, método, ubicación y si llegó diferida desde la cola sin conexión. El trabajador ve solo las suyas y el supervisor las de sus instalaciones.",
  permiso: null,
  portales: PORTALES,
  input: z
    .object({
      personaId: uuid.optional(),
      instalacionId: uuid.optional(),
      desde: fechaIso,
      hasta: fechaIso,
      despuesDeSeq: z.number().int().min(0).default(0),
    })
    .refine((i) => i.hasta >= i.desde, "«hasta» no puede ser anterior a «desde».")
    .refine((i) => Date.parse(i.hasta) - Date.parse(i.desde) <= MAX_DIAS * 86_400_000, `Como máximo ${MAX_DIAS} días.`),
  output: z.object({ items: z.array(marcaVistaSchema), siguienteSeq: z.number().int().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((m) => m.id),
  async handler(ctx, i) {
    const alcance = await alcanceMarcas(ctx);
    const filas = await ctx.db.marca.findMany({
      where: {
        seq: { gt: i.despuesDeSeq },
        horaServidor: { gte: new Date(i.desde), lte: new Date(i.hasta) },
        AND: [alcance, i.instalacionId ? { instalacionId: i.instalacionId } : {}, i.personaId ? { personaId: i.personaId } : {}],
      },
      orderBy: { seq: "asc" },
      take: LIMITE + 1,
    });
    const pagina = filas.slice(0, LIMITE);
    return { items: pagina.map(vistaDeMarca), siguienteSeq: filas.length > LIMITE ? (pagina.at(-1)?.seq ?? null) : null };
  },
});

export const marcasObtener = defineCapability({
  id: "asistencia.marcas.obtener",
  descripcion:
    "Obtiene una marca legal de asistencia por su identificador, con el mismo alcance que el listado: el trabajador solo ve las suyas y el supervisor las de sus instalaciones.",
  permiso: null,
  portales: PORTALES,
  input: z.object({ id: uuid }),
  output: marcaVistaSchema,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.id],
  async handler(ctx, i) {
    const alcance = await alcanceMarcas(ctx);
    const f = await ctx.db.marca.findFirst({ where: { id: i.id, AND: [alcance] } });
    if (!f) throw noEncontrado("La marca");
    return vistaDeMarca(f);
  },
});

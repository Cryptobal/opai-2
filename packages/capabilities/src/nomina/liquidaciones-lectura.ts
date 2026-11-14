import { z } from "zod";

import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_NOVEDADES_READ, iso, periodoDe } from "./comun";
import { nombresDe } from "./novedades-vista";

// Lecturas de liquidaciones (Brief 27): montos de remuneración por persona, dato sensible. Se auditan por
// los IDs revelados (NÚCLEO-H) y quedan fuera para gerente, supervisor y viewer (bloqueo financiero).
const lineaSchema = z.object({ concepto: z.string(), monto: z.number().int() });

const resumenSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  personaNombre: z.string(),
  estado: z.enum(["calculada", "revisada"]),
  diasTrabajados: z.number().int(),
  haberes: z.number().int(),
  descuentos: z.number().int().describe("Descuentos legales más anticipos, cuotas y otros descuentos."),
  liquido: z.number().int(),
  advertencias: z.array(z.string()),
});

type Fila = {
  id: string; personaId: string; estado: string; diasTrabajados: number; haberes: number;
  descuentosLegales: number; otrosDescuentos: number; liquido: number; advertencias: unknown;
};
const textos = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const resumen = (f: Fila, nombre: string): z.output<typeof resumenSchema> => ({
  id: f.id,
  personaId: f.personaId,
  personaNombre: nombre,
  estado: f.estado === "revisada" ? "revisada" : "calculada",
  diasTrabajados: f.diasTrabajados,
  haberes: f.haberes,
  descuentos: f.descuentosLegales + f.otrosDescuentos,
  liquido: f.liquido,
  advertencias: textos(f.advertencias),
});

/** Liquidaciones de un período, con el total del período. */
export const liquidacionesListar = defineCapability({
  id: "nomina.liquidaciones.listar",
  descripcion:
    "Lista las liquidaciones calculadas de un período: persona, días trabajados, haberes, descuentos, líquido a pagar y avisos, más el total líquido y el costo empresa del período. La lectura queda auditada.",
  permiso: PERMISO_NOVEDADES_READ,
  input: z.object({
    periodoId: uuidSchema,
    cursor: z.string().optional().describe("Id de la última liquidación de la página anterior."),
    limite: z.number().int().min(1).max(200).default(100),
  }),
  output: z.object({
    items: z.array(resumenSchema),
    siguiente: z.string().nullable(),
    total: z.object({ personas: z.number().int(), liquido: z.number().int(), costoEmpresa: z.number().int() }),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((i) => i.id),
  async handler(ctx, { periodoId, cursor, limite }) {
    await periodoDe(ctx, periodoId);
    const filas = await ctx.db.nominaLiquidacion.findMany({
      where: { periodoId, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: "asc" },
      take: limite + 1,
    });
    const pagina = filas.slice(0, limite);
    const todas = await ctx.db.nominaLiquidacion.findMany({ where: { periodoId }, select: { liquido: true, costoEmpresa: true } });
    const nombres = await nombresDe(ctx.db, pagina.map((f) => f.personaId));
    return {
      items: pagina.map((f) => resumen(f, nombres.get(f.personaId) ?? "")),
      siguiente: filas.length > limite ? (pagina[pagina.length - 1]?.id ?? null) : null,
      total: {
        personas: todas.length,
        liquido: todas.reduce((s, f) => s + f.liquido, 0),
        costoEmpresa: todas.reduce((s, f) => s + f.costoEmpresa, 0),
      },
    };
  },
});

/** Una liquidación con su detalle de haberes y descuentos. */
export const liquidacionesObtener = defineCapability({
  id: "nomina.liquidaciones.obtener",
  descripcion:
    "Muestra una liquidación con el detalle de haberes, descuentos legales (AFP, salud, seguro de cesantía, impuesto único) y otros descuentos (anticipos, cuotas de préstamo), el líquido a pagar y el costo empresa. La lectura queda auditada.",
  permiso: PERMISO_NOVEDADES_READ,
  input: z.object({ id: uuidSchema }),
  output: resumenSchema.extend({
    periodoId: z.string(),
    imponible: z.number().int(),
    costoEmpresa: z.number().int(),
    detalle: z.object({
      haberes: z.array(lineaSchema),
      descuentosLegales: z.array(lineaSchema),
      otrosDescuentos: z.array(lineaSchema),
    }),
    calculadaEn: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.id],
  async handler(ctx, { id }) {
    const f = await ctx.db.nominaLiquidacion.findUnique({ where: { id } });
    if (!f) throw noEncontrado("La liquidación");
    const nombres = await nombresDe(ctx.db, [f.personaId]);
    const d = (f.detalle ?? {}) as Record<string, unknown>;
    const lineas = (v: unknown) => z.array(lineaSchema).catch([]).parse(v);
    return {
      ...resumen(f, nombres.get(f.personaId) ?? ""),
      periodoId: f.periodoId,
      imponible: f.imponible,
      costoEmpresa: f.costoEmpresa,
      detalle: { haberes: lineas(d.haberes), descuentosLegales: lineas(d.descuentosLegales), otrosDescuentos: lineas(d.otrosDescuentos) },
      calculadaEn: iso(f.calculadaEn),
    };
  },
});

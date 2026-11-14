import { z } from "zod";

import { archivoLre, type DatosLre, type LineaLiquidacion } from "@opai/domain";

import { defineCapability } from "../define";
import { ajuste } from "../core/config";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_OBLIGACIONES, dia, periodoDe } from "./comun";
import { exigirVistaCompleta } from "./liquidaciones-lectura";

// Libro de Remuneraciones Electrónico (CAR-99, ADR-057): arma el archivo del período con sus
// liquidaciones. Lleva RUT y montos por persona: exige ver a todo el personal y los sueldos sensibles, y
// la lectura queda auditada con los IDs de las personas incluidas. OPAI no envía nada a la DT (R11).

const lineaSchema = z.object({ concepto: z.string(), monto: z.number().int() });
const lineas = (v: unknown) => z.array(lineaSchema).catch([]).parse(v);

export const lreGenerar = defineCapability({
  id: "nomina.lre.generar",
  descripcion:
    "Genera el archivo del Libro de Remuneraciones Electrónico (LRE) de un período con sus liquidaciones calculadas, listo para que el representante laboral lo revise y lo cargue en Mi DT. Valida RUT, cuadratura y datos del empleador. El formato queda «por verificar» hasta contrastarlo con el Suplemento LRE vigente. La lectura queda auditada.",
  permiso: PERMISO_OBLIGACIONES,
  input: z.object({ periodoId: uuidSchema }),
  output: z.object({
    nombre: z.string().describe("Nombre del archivo: rutempleador_aaaamm.csv."),
    contenido: z.string().describe("Archivo CSV separado por «;», con encabezado y una fila por persona."),
    filas: z.number().int(),
    personaIds: z.array(z.string()).describe("Personas incluidas en el archivo."),
    errores: z.array(z.object({ personaId: z.string().nullable(), mensaje: z.string() })),
    advertencias: z.array(z.string()),
    formatoVerificado: z.literal(false).describe("Siempre false: el formato oficial está por verificar."),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.personaIds,
  async handler(ctx, { periodoId }) {
    exigirVistaCompleta(ctx);
    const periodo = await periodoDe(ctx, periodoId);
    const liqs = await ctx.db.nominaLiquidacion.findMany({
      where: { periodoId },
      orderBy: { id: "asc" },
      select: { personaId: true, diasTrabajados: true, liquido: true, detalle: true },
    });
    const ids = liqs.map((l) => l.personaId);
    const [personas, vinculos, rutEmpleador] = await Promise.all([
      ids.length ? ctx.db.persona.findMany({ where: { id: { in: ids } }, select: { id: true, rut: true } }) : [],
      ids.length
        ? ctx.db.vinculoLaboral.findMany({
            where: {
              personaId: { in: ids },
              tipo: { not: "honorarios" },
              inicio: { lte: periodo.fin },
              OR: [{ termino: null }, { termino: { gte: periodo.inicio } }],
            },
            orderBy: [{ inicio: "desc" }, { id: "asc" }],
            select: { personaId: true, inicio: true, termino: true },
          })
        : [],
      ajuste<string>(ctx, "nomina", "empleador_rut").catch(() => ""),
    ]);
    const rut = new Map(personas.map((p) => [p.id, p.rut]));
    const vinculo = new Map<string, { inicio: Date; termino: Date | null }>();
    for (const v of vinculos) if (!vinculo.has(v.personaId)) vinculo.set(v.personaId, v);
    const sinVinculo: string[] = [];
    const filas: DatosLre[] = liqs.flatMap((l) => {
      const v = vinculo.get(l.personaId);
      if (!v) {
        sinVinculo.push(l.personaId);
        return [];
      }
      const d = (l.detalle ?? {}) as Record<string, unknown>;
      const termino = v.termino && v.termino <= periodo.fin ? dia(v.termino) : null;
      return [{
        personaId: l.personaId,
        rut: rut.get(l.personaId) ?? "",
        inicioContrato: dia(v.inicio) ?? "",
        terminoContrato: termino,
        diasTrabajados: l.diasTrabajados,
        diasLicencia: typeof d.diasLicencia === "number" ? d.diasLicencia : 0,
        haberes: lineas(d.haberes),
        descuentosLegales: lineas(d.descuentosLegales),
        otrosDescuentos: lineas(d.otrosDescuentos),
        aportesEmpleador: Array.isArray(d.aportesEmpleador) ? (lineas(d.aportesEmpleador) satisfies LineaLiquidacion[]) : null,
        liquido: l.liquido,
      }];
    });
    const a = archivoLre({ rutEmpleador: rutEmpleador ?? "", anio: periodo.anio, mes: periodo.mes, filas });
    const errores = [
      ...(liqs.length === 0 ? [{ personaId: null, mensaje: "El período no tiene liquidaciones calculadas." }] : []),
      ...sinVinculo.map((personaId) => ({ personaId, mensaje: "Sin contrato vigente en el mes: no va en el archivo." })),
      ...a.errores,
    ];
    return { ...a, errores, personaIds: filas.map((f) => f.personaId), formatoVerificado: false as const };
  },
});

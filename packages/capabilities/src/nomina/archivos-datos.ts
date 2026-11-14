import { z } from "zod";

import { AFP, type AdministradoraAFP, type LineaLiquidacion } from "@opai/domain";

import { ajuste } from "../core/config";
import type { Contexto } from "../types";
import { dia, periodoDe } from "./comun";
import { exigirVistaCompleta } from "./liquidaciones-lectura";

// Datos comunes de los archivos legales del período (LRE y Previred, CAR-99): liquidaciones con su
// persona, contrato vigente del mes y previsión. Traen RUT y montos por persona: exigen vista completa
// y sueldos sensibles (la auditoría la hace cada capacidad con las personas reveladas).

const lineaSchema = z.object({ concepto: z.string(), monto: z.number().int() });
const lineas = (v: unknown): LineaLiquidacion[] => z.array(lineaSchema).catch([]).parse(v);
const previsionSchema = z.object({
  afp: z.enum(AFP), salud: z.enum(["fonasa", "isapre"]), basePrevisional: z.number().int(), baseCesantia: z.number().int(),
});

export const errorArchivoSchema = z.object({ personaId: z.string().nullable(), mensaje: z.string() });
export type ErrorArchivo = z.infer<typeof errorArchivoSchema>;

/** Todas las personas reveladas: las del archivo y las que salen en las observaciones. */
export const personasReveladas = (s: { personaIds: string[]; errores: ErrorArchivo[] }) =>
  [...new Set([...s.personaIds, ...s.errores.flatMap((e) => (e.personaId ? [e.personaId] : []))])];

export type FilaArchivo = {
  personaId: string;
  persona: { rut: string; nombres: string; apellidos: string; sexo: string | null; nacionalidad: string };
  inicio: string;
  /** aaaa-mm-dd si el contrato empieza o termina dentro del mes. */
  ingresoEnMes: string | null;
  terminoEnMes: string | null;
  diasTrabajados: number;
  diasLicencia: number;
  liquido: number;
  haberes: LineaLiquidacion[];
  descuentosLegales: LineaLiquidacion[];
  otrosDescuentos: LineaLiquidacion[];
  aportesEmpleador: LineaLiquidacion[] | null;
  prevision: { afp: AdministradoraAFP; salud: "fonasa" | "isapre"; basePrevisional: number; baseCesantia: number } | null;
  ficha: { tramo: string | null; simples: number; maternales: number; invalidez: number; jubilado: boolean } | null;
};

export async function datosArchivoPeriodo(ctx: Contexto, periodoId: string, legal: string) {
  exigirVistaCompleta(ctx);
  const periodo = await periodoDe(ctx, periodoId);
  const liqs = await ctx.db.nominaLiquidacion.findMany({
    where: { periodoId }, orderBy: { id: "asc" },
    select: { personaId: true, diasTrabajados: true, liquido: true, detalle: true },
  });
  const ids = liqs.map((l) => l.personaId);
  const hay = ids.length > 0;
  const [personas, vinculos, fichas, rutAjuste, perfil] = await Promise.all([
    hay ? ctx.db.persona.findMany({ where: { id: { in: ids } }, select: { id: true, rut: true, nombres: true, apellidos: true, sexo: true, nacionalidad: true } }) : [],
    hay
      ? ctx.db.vinculoLaboral.findMany({
          where: { personaId: { in: ids }, inicio: { lte: periodo.fin }, OR: [{ termino: null }, { termino: { gte: periodo.inicio } }] },
          orderBy: [{ inicio: "desc" }, { id: "asc" }],
          select: { personaId: true, tipo: true, inicio: true, termino: true },
        })
      : [],
    hay
      ? ctx.db.personaPrevision.findMany({
          where: { personaId: { in: ids } },
          select: { personaId: true, tramoAsignacion: true, cargasSimples: true, cargasMaternales: true, cargasInvalidez: true, jubilado: true },
        })
      : [],
    ajuste<string>(ctx, "nomina", "empleador_rut"),
    ctx.db.perfilEmpresa.findFirst({ select: { rut: true } }),
  ]);
  // El RUT del empleador de Remuneraciones manda; si está vacío, el de los datos de la empresa.
  const rutEmpleador = rutAjuste?.trim() || perfil?.rut || "";
  const persona = new Map(personas.map((p) => [p.id, p]));
  const ficha = new Map(fichas.map((f) => [f.personaId, f]));
  const vinculo = new Map<string, { tipo: string; inicio: Date; termino: Date | null }>();
  for (const v of vinculos) if (!vinculo.has(v.personaId)) vinculo.set(v.personaId, v);
  const errores: ErrorArchivo[] = liqs.length === 0 ? [{ personaId: null, mensaje: "El período no tiene liquidaciones calculadas." }] : [];
  const filas: FilaArchivo[] = liqs.flatMap((l) => {
    const v = vinculo.get(l.personaId);
    const p = persona.get(l.personaId);
    if (!v || !p || v.tipo === "honorarios") {
      const mensaje = !p ? "Persona no encontrada: no va en el archivo."
        : v?.tipo === "honorarios" ? `Contrato a honorarios: no va en el ${legal}.` : "Sin contrato vigente en el mes: no va en el archivo.";
      errores.push({ personaId: l.personaId, mensaje });
      return [];
    }
    const d = (l.detalle ?? {}) as Record<string, unknown>;
    const prev = previsionSchema.safeParse(d.prevision);
    const f = ficha.get(l.personaId);
    return [{
      personaId: l.personaId,
      persona: { rut: p.rut, nombres: p.nombres, apellidos: p.apellidos, sexo: p.sexo ?? null, nacionalidad: p.nacionalidad },
      inicio: dia(v.inicio) ?? "",
      ingresoEnMes: v.inicio >= periodo.inicio ? dia(v.inicio) : null,
      terminoEnMes: v.termino && v.termino <= periodo.fin ? dia(v.termino) : null,
      diasTrabajados: l.diasTrabajados,
      diasLicencia: typeof d.diasLicencia === "number" ? d.diasLicencia : 0,
      liquido: l.liquido,
      haberes: lineas(d.haberes),
      descuentosLegales: lineas(d.descuentosLegales),
      otrosDescuentos: lineas(d.otrosDescuentos),
      aportesEmpleador: Array.isArray(d.aportesEmpleador) ? lineas(d.aportesEmpleador) : null,
      prevision: prev.success ? prev.data : null,
      ficha: f ? { tramo: f.tramoAsignacion, simples: f.cargasSimples, maternales: f.cargasMaternales, invalidez: f.cargasInvalidez, jubilado: f.jubilado } : null,
    }];
  });
  return { periodo, filas, errores, rutEmpleador };
}

// Piezas comunes del seguimiento comercial (CAR-67): esquemas, calendario hábil del tenant y vistas.
import { z } from "zod";

import {
  CANALES_PASO, type AmbitoHabil, type ConfigPlan, EJECUTORES_PASO, MAX_PASOS,
  estadoVisible, feriadosLegalesComoEntradas, proximoPaso, resolverFeriados,
  type EstadoPaso, type EstadoSeguimiento,
} from "@opai/domain";

import { noEncontrado } from "../errores";
import type { Contexto } from "../types";

export const pasoPlanSchema = z.object({
  dias: z.number().int().min(0).max(365),
  hora: z.string().optional(),
  canal: z.enum(CANALES_PASO),
  ejecutor: z.enum(EJECUTORES_PASO),
  titulo: z.string().trim().min(1).max(60),
  guion: z.string().max(2000).optional(),
  etapaDestino: z.uuid().optional().describe("Etapa abierta (id) a la que avanza el negocio al hacerse el paso; nunca ganada ni perdida."),
});
export const configPlanSchema = z.object({
  conteo: z.enum(["habiles", "corridos"]),
  desde: z.enum(["inicio", "paso_anterior"]),
  hora: z.string(),
  ventana: z.object({ desde: z.string(), hasta: z.string() }),
  alResponder: z.enum(["pausar", "detener"]),
  etapaAlResponder: z.uuid().optional(),
  alTerminar: z.enum(["proponer_cierre", "aplicar_cierre_propuesto", "solo_avisar"]),
  noCerrarDesdeEtapa: z.uuid().optional(),
  pasos: z.array(pasoPlanSchema).max(MAX_PASOS),
});

export const pasoVistaSchema = z.object({
  id: z.string(), orden: z.number(), titulo: z.string(), canal: z.enum(CANALES_PASO),
  ejecutor: z.enum(EJECUTORES_PASO), estado: z.string(), programadoEn: z.string(),
  asignadoId: z.string().nullable(), asunto: z.string().nullable(), cuerpo: z.string().nullable(),
  resultado: z.string().nullable(), error: z.string().nullable(), hechoEn: z.string().nullable(),
});
export const seguimientoVistaSchema = z.object({
  id: z.string(), negocioId: z.string(), planId: z.string(), planNombre: z.string(),
  planVersion: z.number(), estado: z.string(), estadoVisible: z.string(), motivo: z.string().nullable(),
  ancla: z.string(), cotizacionCodigo: z.string().nullable(), contactoId: z.string().nullable(),
  pasos: z.array(pasoVistaSchema), proximoPasoId: z.string().nullable(),
});
export type SeguimientoVista = z.infer<typeof seguimientoVistaSchema>;

export const ZONA_POR_DEFECTO = "America/Santiago";
export async function zonaDe(ctx: Contexto): Promise<string> {
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { timezone: true } });
  return t?.timezone ?? ZONA_POR_DEFECTO;
}

/** Feriados del tenant (legales por regla + tabla de plataforma + propios) del año de `desde` y el siguiente. */
export async function ambitoHabil(ctx: Contexto, desde: Date): Promise<AmbitoHabil> {
  const a = desde.getUTCFullYear();
  const filas = await ctx.db.diaCalendario.findMany({
    where: {
      archivadaEn: null, instalacionId: null,
      fecha: { gte: new Date(`${a}-01-01T00:00:00Z`), lte: new Date(`${a + 1}-12-31T00:00:00Z`) },
      OR: [{ tenantId: null, fuente: "nacional" }, { tenantId: ctx.tenantId }],
    },
  });
  const entradas = [
    ...feriadosLegalesComoEntradas(a), ...feriadosLegalesComoEntradas(a + 1),
    ...filas.map((f) => ({
      fecha: f.fecha.toISOString().slice(0, 10), nombre: f.nombre, irrenunciable: f.irrenunciable,
      fuente: f.fuente as "nacional" | "regional" | "tenant", region: f.region, esTenant: f.tenantId !== null,
    })),
  ];
  return new Set(resolverFeriados(entradas).map((f) => f.fecha));
}

/** Configuración congelada de una versión de plan. */
export async function configDeVersion(ctx: Contexto, planId: string, version: number): Promise<ConfigPlan> {
  const v = await ctx.db.planSeguimientoVersion.findUnique({ where: { planId_version: { planId, version } } });
  if (!v) throw noEncontrado("La versión del plan");
  return configPlanSchema.parse(v.config);
}

type FilaPaso = {
  id: string; orden: number; canal: string; ejecutor: string; estado: string; programadoEn: Date;
  asignadoId: string | null; asunto: string | null; cuerpo: string | null; resultado: string | null;
  error: string | null; hechoEn: Date | null;
};
type FilaSeg = {
  id: string; negocioId: string; planId: string; planVersion: number; estado: string; motivo: string | null;
  ancla: Date; cotizacionCodigo: string | null; contactoId: string | null;
};

export function vistaSeguimiento(
  s: FilaSeg, pasos: FilaPaso[], config: ConfigPlan, planNombre: string, ahora = new Date(),
): SeguimientoVista {
  const ordenados = [...pasos].sort((a, b) => a.orden - b.orden);
  const prox = proximoPaso(ordenados.map((p) => ({ ...p, estado: p.estado as EstadoPaso })));
  return {
    id: s.id, negocioId: s.negocioId, planId: s.planId, planNombre, planVersion: s.planVersion,
    estado: s.estado, motivo: s.motivo, ancla: s.ancla.toISOString(),
    cotizacionCodigo: s.cotizacionCodigo, contactoId: s.contactoId,
    estadoVisible: estadoVisible(s.estado as EstadoSeguimiento, ordenados.map((p) => ({ estado: p.estado as EstadoPaso, programadoEn: p.programadoEn })), ahora),
    proximoPasoId: prox?.id ?? null,
    pasos: ordenados.map((p) => ({
      id: p.id, orden: p.orden, titulo: config.pasos[p.orden - 1]?.titulo ?? `Paso ${p.orden}`,
      canal: p.canal as FilaPaso["canal"] & (typeof CANALES_PASO)[number],
      ejecutor: p.ejecutor as (typeof EJECUTORES_PASO)[number], estado: p.estado,
      programadoEn: p.programadoEn.toISOString(), asignadoId: p.asignadoId, asunto: p.asunto,
      cuerpo: p.cuerpo, resultado: p.resultado, error: p.error, hechoEn: p.hechoEn?.toISOString() ?? null,
    })),
  };
}

/** Seguimiento por id con sus pasos y la vista lista para devolver. */
export async function seguimientoPorId(ctx: Contexto, id: string): Promise<SeguimientoVista> {
  const s = await ctx.db.seguimiento.findUnique({ where: { id } });
  if (!s) throw noEncontrado("El seguimiento");
  const [pasos, plan, config] = await Promise.all([
    ctx.db.seguimientoPaso.findMany({ where: { seguimientoId: id } }),
    ctx.db.planSeguimiento.findUnique({ where: { id: s.planId } }),
    configDeVersion(ctx, s.planId, s.planVersion),
  ]);
  return vistaSeguimiento(s, pasos, config, plan?.nombre ?? "");
}

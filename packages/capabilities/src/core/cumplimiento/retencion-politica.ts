import { z } from "zod";

import { POLITICA_RETENCION, PERMISOS_CORE, describirRegla } from "@opai/domain";

import { defineCapability } from "../../define";
import type { Contexto } from "../../types";
import { ajuste } from "../config";
import { claveAjusteRetencion } from "../config/nucleo-retencion";

/**
 * Días efectivos de una regla: el ajuste del tenant si la aplica el trabajo o si está pendiente de
 * decisión (configurable, parte en 0 y no se aplica, CAR-39); si no, el valor del catálogo.
 */
export async function diasDeRegla(
  ctx: Contexto,
  r: { clave: string; gestion: string; diasPropuestos: number },
): Promise<number> {
  if (r.gestion !== "trabajo" && r.gestion !== "pendiente") return r.diasPropuestos;
  return ajuste<number>(ctx, "core", claveAjusteRetencion(r.clave));
}

export const politicaActiva = (ctx: Contexto): Promise<boolean> =>
  ajuste<boolean>(ctx, "core", "cumplimiento_retencion_activa");

/** Política efectiva del tenant: el catálogo con los días vigentes y su descripción para el RAT. */
export async function politicaEfectiva(ctx: Contexto) {
  const reglas = [];
  for (const r of POLITICA_RETENCION) {
    const dias = await diasDeRegla(ctx, r);
    reglas.push({ ...r, dias, descripcion: describirRegla(r, dias) });
  }
  return { activa: await politicaActiva(ctx), reglas };
}

const reglaSchema = z.object({
  clave: z.string(),
  nombre: z.string().describe("Nombre del dato para el cliente."),
  tabla: z.string(),
  categoria: z.string(),
  accion: z.string(),
  desde: z.string(),
  dias: z.number().describe("Días vigentes del tenant; 0 = sin vencimiento por política."),
  gestion: z.string(),
  descripcion: z.string(),
});

const ejecucionSchema = z.object({
  id: z.string(),
  tabla: z.string(),
  accion: z.string(),
  modo: z.string(),
  origen: z.string(),
  filas: z.number(),
  dias: z.number().nullable(),
  creadoEn: z.string(),
});

export const retencionPolitica = defineCapability({
  id: "core.cumplimiento.retencion_politica",
  descripcion:
    "Política de retención de datos personales de la empresa (Ley 21.719): por tabla, qué se anonimiza o elimina y a los cuántos días (periodos propuestos, a confirmar con el abogado), si la política está activa y qué hizo o simuló el trabajo diario. Solo lectura.",
  permiso: PERMISOS_CORE.cumplimientoRead,
  input: z.object({}),
  output: z.object({
    /** Apagada: el trabajo diario solo simula y registra lo que haría, sin tocar datos. */
    activa: z.boolean(),
    periodosPropuestos: z.boolean(),
    reglas: z.array(reglaSchema),
    ejecuciones: z.array(ejecucionSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const { activa, reglas } = await politicaEfectiva(ctx);
    const filas = await ctx.db.retencionEjecucion.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 30,
    });
    return {
      activa,
      periodosPropuestos: true,
      reglas: reglas.map((r) => ({
        clave: r.clave,
        nombre: r.nombre,
        tabla: r.tabla,
        categoria: r.categoria,
        accion: r.accion,
        desde: r.desde,
        dias: r.dias,
        gestion: r.gestion,
        descripcion: r.descripcion,
      })),
      ejecuciones: filas.map((f) => ({
        id: f.id,
        tabla: f.tabla,
        accion: f.accion,
        modo: f.modo,
        origen: f.origen,
        filas: f.filas,
        dias: f.dias,
        creadoEn: f.createdAt.toISOString(),
      })),
    };
  },
});

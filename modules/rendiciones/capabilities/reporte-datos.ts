import { reglaDeNegocio, type Contexto } from "@opai/capabilities";
import { instanteLocal } from "@opai/domain";
import { z } from "zod";

import { AGRUPACIONES, CLAVE_ADMINISTRACION, diasDelPeriodo, ESTADOS_GASTO, MAX_DIAS_REPORTE } from "../domain";
import { nombresDe } from "./vista";

const ZONA = "America/Santiago";
/** Más filas que esto en un período no se suman en línea: se pide acortarlo (nunca se trunca en silencio). */
const MAX_FILAS_REPORTE = 20_000;

const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato aaaa-mm-dd.")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d, { message: "Esa fecha no existe." });

export const periodoSchema = z
  .object({
    desde: fechaSchema.describe("Primer día del período (aaaa-mm-dd), por fecha de aprobación."),
    hasta: fechaSchema.describe("Último día del período (aaaa-mm-dd), incluido."),
  })
  .refine((p) => diasDelPeriodo(p.desde, p.hasta) >= 1, { message: "«Hasta» no puede ser anterior a «desde»." })
  .refine((p) => diasDelPeriodo(p.desde, p.hasta) <= MAX_DIAS_REPORTE, { message: "El período puede ser de hasta un año." });

export const agrupacionSchema = z.enum(AGRUPACIONES).describe("persona, categoria (compra o kilometraje) o centro (instalación o Administración).");

const sumarDia = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** Rendiciones aprobadas o pagadas cuya aprobación cae en el período (días civiles de Chile). */
export async function filasDelPeriodo(ctx: Contexto, desde: string, hasta: string) {
  const filas = await ctx.db.rendicion.findMany({
    where: {
      estado: { in: [...ESTADOS_GASTO] },
      decididaEn: { gte: instanteLocal(desde, "00:00", ZONA), lt: instanteLocal(sumarDia(hasta), "00:00", ZONA) },
    },
    select: { id: true, codigo: true, tipo: true, estado: true, solicitanteId: true, centroCosto: true, instalacionId: true, montoTotal: true, decididaEn: true },
    orderBy: { codigo: "asc" },
    take: MAX_FILAS_REPORTE + 1,
  });
  if (filas.length > MAX_FILAS_REPORTE) throw reglaDeNegocio("El período tiene demasiadas rendiciones para un reporte: acórtalo.");
  return filas;
}

const CATEGORIAS: Record<string, string> = { compra: "Compra", kilometraje: "Kilometraje" };
const ETIQUETA_ADMINISTRACION = "Administración / Oficina central";

/** Nombres visibles de personas e instalaciones del mismo tenant; lo que ya no existe queda «Sin nombre». */
export async function etiquetasDe(ctx: Contexto, personas: readonly string[], instalaciones: readonly string[]) {
  const [nombres, inst] = await Promise.all([
    nombresDe(ctx, personas),
    instalaciones.length ? ctx.db.instalacion.findMany({ where: { id: { in: [...new Set(instalaciones)] } }, select: { id: true, nombre: true } }) : [],
  ]);
  const mInst = new Map(inst.map((i) => [i.id, i.nombre]));
  return {
    persona: (id: string) => nombres.get(id) ?? "Sin nombre",
    instalacion: (id: string | null) => (id ? mInst.get(id) ?? "Sin nombre" : ETIQUETA_ADMINISTRACION),
    categoria: (tipo: string) => CATEGORIAS[tipo] ?? tipo,
    centro: (clave: string) => (clave === CLAVE_ADMINISTRACION ? ETIQUETA_ADMINISTRACION : mInst.get(clave) ?? "Sin nombre"),
  };
}

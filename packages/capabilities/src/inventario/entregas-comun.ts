// Entregas de Inventario (CAR-238): destino validado en la empresa y en el alcance, y la vista de una
// entrega con los nombres de lo entregado y de quién lo tiene.
import { errorDeDestino, errorDeDestinoResuelto } from "@opai/domain";
import { z } from "zod";

import { dondePersona, instalacionesEnAlcance } from "../core/maestros/alcance";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

export const destinoSchema = {
  personaId: z.uuid().optional().describe("Persona que recibe. Se imputa a su instalación vigente del contrato."),
  instalacionId: z
    .uuid()
    .optional()
    .describe("Instalación de imputación o destino directo (bodega). Con personaId debe coincidir con el contrato vigente."),
};

export const entregaSchema = z.object({
  id: z.string(),
  clase: z.enum(["activo", "ropa"]),
  item: z.string().describe("Código del activo o nombre de la prenda con su talla."),
  activoId: z.string().nullable(),
  tipoId: z.string().nullable(),
  talla: z.string().nullable(),
  cantidad: z.number().int().nullable(),
  personaId: z.string().nullable(),
  instalacionId: z.string().nullable(),
  destino: z.string().describe("Nombre de la persona o de la instalación."),
  nota: z.string().nullable(),
  entregadaEn: z.string(),
  devueltaEn: z.string().nullable(),
  notaDevolucion: z.string().nullable(),
});
export type VistaEntrega = z.infer<typeof entregaSchema>;

/** Alcance (ADR-022, R23): un supervisor ve y gestiona solo entregas a sus instalaciones o a personas de ellas. */
export async function dondeEntregaEnAlcance(ctx: Contexto) {
  const ids = instalacionesEnAlcance(ctx);
  if (!ids) return {};
  const personas = await ctx.db.persona.findMany({ where: { AND: [dondePersona(ctx)] }, select: { id: true } });
  return { OR: [{ instalacionId: { in: [...ids] } }, { personaId: { in: personas.map((p) => p.id) } }] };
}

/** R19 / CAR-487 y alcance (ADR-022): destino válido y, si hay persona, instalación de imputación. */
export async function exigirDestino(
  ctx: Contexto,
  d: { personaId?: string | undefined; instalacionId?: string | undefined },
): Promise<{ personaId: string | null; instalacionId: string | null }> {
  const error = errorDeDestino(d);
  if (error) throw reglaDeNegocio(error);
  if (d.personaId) {
    const p = await ctx.db.persona.findFirst({ where: { id: d.personaId, AND: [dondePersona(ctx)] }, select: { id: true } });
    if (!p) throw noEncontrado("La persona");
    const vinculo = await ctx.db.vinculoLaboral.findFirst({
      where: {
        personaId: d.personaId,
        estado: "vigente",
        instalacionId: { not: null },
      },
      select: { instalacionId: true },
      orderBy: { inicio: "desc" },
    });
    const imputacion = vinculo?.instalacionId ?? null;
    if (!imputacion)
      throw reglaDeNegocio("La persona no tiene contrato vigente con instalación para imputar esta entrega.");
    if (d.instalacionId && d.instalacionId !== imputacion)
      throw reglaDeNegocio("La instalación indicada no coincide con la instalación vigente de la persona.");
    const ids = instalacionesEnAlcance(ctx);
    if (ids && !ids.includes(imputacion)) throw noEncontrado("La instalación de imputación");
    const resuelto = { personaId: d.personaId, instalacionId: imputacion };
    const errorResuelto = errorDeDestinoResuelto(resuelto);
    if (errorResuelto) throw reglaDeNegocio(errorResuelto);
    return resuelto;
  }
  if (!d.instalacionId) throw reglaDeNegocio(errorDeDestino(d) ?? "Destino inválido.");
  const ids = instalacionesEnAlcance(ctx);
  if (ids && !ids.includes(d.instalacionId)) throw noEncontrado("La instalación");
  const i = await ctx.db.instalacion.findFirst({ where: { id: d.instalacionId }, select: { id: true } });
  if (!i) throw noEncontrado("La instalación");
  return { personaId: null, instalacionId: d.instalacionId };
}

type Fila = {
  id: string;
  activoId: string | null;
  tipoId: string | null;
  talla: string | null;
  cantidad: number | null;
  personaId: string | null;
  instalacionId: string | null;
  nota: string | null;
  entregadaEn: Date;
  devueltaEn: Date | null;
  notaDevolucion: string | null;
};

/** Arma las vistas con los nombres de activos, prendas, personas e instalaciones en pocas consultas. */
export async function vistasEntrega(ctx: Contexto, filas: Fila[]): Promise<VistaEntrega[]> {
  const ids = (k: keyof Fila) => [...new Set(filas.map((f) => f[k]).filter((x): x is string => typeof x === "string"))];
  const [activos, tipos, personas, instalaciones] = await Promise.all([
    ctx.db.inventarioActivo.findMany({ where: { id: { in: ids("activoId") } }, select: { id: true, codigo: true } }),
    ctx.db.inventarioTipo.findMany({ where: { id: { in: ids("tipoId") } }, select: { id: true, nombre: true } }),
    ctx.db.persona.findMany({ where: { id: { in: ids("personaId") } }, select: { id: true, nombres: true, apellidos: true } }),
    ctx.db.instalacion.findMany({ where: { id: { in: ids("instalacionId") } }, select: { id: true, nombre: true } }),
  ]);
  const nombre = new Map<string, string>([
    ...activos.map((a) => [a.id, a.codigo] as const),
    ...tipos.map((t) => [t.id, t.nombre] as const),
    ...personas.map((p) => [p.id, `${p.nombres} ${p.apellidos}`.trim()] as const),
    ...instalaciones.map((i) => [i.id, i.nombre] as const),
  ]);
  return filas.map((f) => ({
    id: f.id,
    clase: f.activoId ? ("activo" as const) : ("ropa" as const),
    item: f.activoId ? (nombre.get(f.activoId) ?? "") : `${nombre.get(f.tipoId ?? "") ?? ""} talla ${f.talla ?? ""}`,
    activoId: f.activoId,
    tipoId: f.tipoId,
    talla: f.talla,
    cantidad: f.cantidad,
    personaId: f.personaId,
    instalacionId: f.instalacionId,
    destino:
      f.personaId && f.instalacionId
        ? `${nombre.get(f.personaId) ?? ""} · ${nombre.get(f.instalacionId) ?? ""}`
        : (nombre.get(f.personaId ?? f.instalacionId ?? "") ?? ""),
    nota: f.nota,
    entregadaEn: f.entregadaEn.toISOString(),
    devueltaEn: f.devueltaEn ? f.devueltaEn.toISOString() : null,
    notaDevolucion: f.notaDevolucion,
  }));
}

export async function vistaEntrega(ctx: Contexto, fila: Fila): Promise<VistaEntrega> {
  const [v] = await vistasEntrega(ctx, [fila]);
  if (!v) throw noEncontrado("La entrega");
  return v;
}

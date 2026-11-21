import { z } from "zod";

import { ALCANCES_LISTA } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import type { Contexto } from "../types";

/** Nombres de las instalaciones de una página (una sola consulta; la RLS acota a la empresa). */
export async function nombresInstalacion(
  ctx: Contexto,
  ids: readonly string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const filas = await ctx.db.instalacion.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, nombre: true },
  });
  return new Map(filas.map((i) => [i.id, i.nombre]));
}

/** Violación de unicidad de Prisma (P2002): otra escritura llegó primero. */
export const esUnica = (e: unknown) =>
  typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === "P2002";

/** Persona responsable de una escritura: el usuario o, si actúa un agente, el usuario por el que actúa. */
export const quien = (ctx: Contexto) =>
  ctx.actor.tipo === "user" ? (ctx.actor.id ?? null) : (ctx.actor.viaUserId ?? null);

/** Documento tal como llega (el número nunca se guarda: solo su huella y su máscara). */
export const documentoSchema = z
  .object({
    tipo: z.enum(["run", "pasaporte", "otro"]),
    numero: z.string().min(1).max(40),
    pais: z.string().min(2).max(3).optional(),
  })
  .strict();

export const PERMISO_READ = "acceso:read";
export const PERMISO_LISTAS = "acceso:listas.manage";
/** Registrar salidas desde el ERP, anular registros y cerrar en bloque (CAR-477). */
export const PERMISO_REGISTROS = "acceso:registros.manage";
/** Ver la patente completa de un registro (decisión de Carlos, 7-nov-2026): acceso restringido. */
export const PERMISO_PATENTE = "acceso:datos.ver_patente";

export const TIPOS_LISTA = ["autorizada", "bloqueada"] as const;
export { TIPOS_REGISTRO } from "@opai/domain";

/** Una entrada de lista tal como se muestra: el documento solo enmascarado, nunca la huella ni el número. */
export const entradaListaSchema = z.object({
  id: uuidSchema,
  alcance: z.enum(ALCANCES_LISTA),
  instalacionId: uuidSchema.nullable(),
  cuentaId: uuidSchema.nullable(),
  grupoId: uuidSchema.nullable(),
  tipo: z.enum(TIPOS_LISTA),
  docTipo: z.string(),
  mascara: z.string(),
  nombre: z.string().nullable(),
  motivo: z.string().nullable(),
  tiposRegistro: z.array(z.string()),
  vigenteDesde: z.string().nullable(),
  vigenteHasta: z.string().nullable(),
  dias: z.array(z.number().int()),
  desdeMin: z.number().int().nullable(),
  hastaMin: z.number().int().nullable(),
  usoUnico: z.boolean(),
});
export type EntradaListaVista = z.infer<typeof entradaListaSchema>;

type Fila = {
  id: string;
  alcance: string;
  instalacionId: string | null;
  cuentaId: string | null;
  grupoId: string | null;
  tipo: string;
  docTipo: string;
  mascara: string;
  nombre: string | null;
  motivo: string | null;
  tiposRegistro: string[];
  vigenteDesde: Date | null;
  vigenteHasta: Date | null;
  dias: number[];
  desdeMin: number | null;
  hastaMin: number | null;
  usoUnico: boolean;
};

export function vistaEntrada(f: Fila): EntradaListaVista {
  const alcance = ALCANCES_LISTA.includes(f.alcance as (typeof ALCANCES_LISTA)[number])
    ? (f.alcance as (typeof ALCANCES_LISTA)[number])
    : "instalacion";
  return {
    id: f.id,
    alcance,
    instalacionId: f.instalacionId,
    cuentaId: f.cuentaId,
    grupoId: f.grupoId,
    tipo: f.tipo === "bloqueada" ? "bloqueada" : "autorizada",
    docTipo: f.docTipo,
    mascara: f.mascara,
    nombre: f.nombre,
    motivo: f.motivo,
    tiposRegistro: f.tiposRegistro,
    vigenteDesde: f.vigenteDesde?.toISOString() ?? null,
    vigenteHasta: f.vigenteHasta?.toISOString() ?? null,
    dias: f.dias,
    desdeMin: f.desdeMin,
    hastaMin: f.hastaMin,
    usoUnico: f.usoUnico,
  };
}

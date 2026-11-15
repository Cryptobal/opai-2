import { z } from "zod";

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

export const PERMISO_READ = "acceso:read";
export const PERMISO_LISTAS = "acceso:listas.manage";
/** Ver la patente completa de un registro (decisión de Carlos, 7-nov-2026): acceso restringido. */
export const PERMISO_PATENTE = "acceso:datos.ver_patente";

export const TIPOS_LISTA = ["autorizada", "bloqueada"] as const;
export const TIPOS_REGISTRO = [
  "visita",
  "contratista",
  "proveedor",
  "vehiculo",
  "despacho",
] as const;

/** Una entrada de lista tal como se muestra: el documento solo enmascarado, nunca la huella ni el número. */
export const entradaListaSchema = z.object({
  id: uuidSchema,
  instalacionId: uuidSchema,
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
  instalacionId: string;
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
  return {
    id: f.id,
    instalacionId: f.instalacionId,
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

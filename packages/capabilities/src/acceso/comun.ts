import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { pagina } from "../core/maestros/comun";
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

/** Persona responsable de una escritura: el usuario o, si actúa un agente, el usuario por el que actúa. */
export const quien = (ctx: Contexto) =>
  ctx.actor.tipo === "user" ? (ctx.actor.id ?? null) : (ctx.actor.viaUserId ?? null);

/** Página de un listado con el nombre de la instalación de cada fila (una sola consulta de nombres). */
export async function paginaConInstalacion<T extends { id: string; instalacionId: string }>(
  ctx: Contexto,
  filas: T[],
  input: { limite: number; cursor?: string | undefined },
) {
  const { items, siguiente } = pagina(filas, input.limite, input.cursor);
  const nombres = await nombresInstalacion(
    ctx,
    items.map((r) => r.instalacionId),
  );
  return { items, siguiente, instalacion: (id: string) => nombres.get(id) ?? "" };
}

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

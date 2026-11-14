import { z } from "zod";

import { normalizarRut, normalizarTelefono } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { conflicto } from "../../errores";
import type { Contexto } from "../../types";

/** RUT chileno: acepta puntos y guion, valida el dígito y devuelve la forma canónica "12345678-5". */
export const rutSchema = z
  .string()
  .trim()
  .transform((v, c) => {
    const r = normalizarRut(v);
    if (!r) c.addIssue({ code: "custom", message: "RUT inválido (revisa el dígito verificador)." });
    return r ?? v;
  })
  .describe('RUT con o sin puntos, con guion y dígito verificador: "76.543.210-3".');

/** Teléfono chileno o internacional → E.164 ("+56912345678"). */
export const telefonoSchema = z
  .string()
  .trim()
  .transform((v, c) => {
    const t = normalizarTelefono(v);
    if (!t) c.addIssue({ code: "custom", message: "Teléfono inválido." });
    return t ?? v;
  });

/** Fecha civil "aaaa-mm-dd" (sin hora ni zona). */
export const diaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato aaaa-mm-dd.")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Fecha inválida.");

export const aFecha = (d: string) => new Date(`${d}T00:00:00.000Z`);
export const opcionalAFecha = (d: string | null | undefined) =>
  d === undefined ? undefined : d === null ? null : aFecha(d);
export const dia = (d: Date | null | undefined): string | null =>
  d ? d.toISOString().slice(0, 10) : null;
export const hoy = () => new Date().toISOString().slice(0, 10);

export const textoOpcional = (max = 500) => z.string().trim().max(max).nullable().optional();

/** Paginación por cursor (id de la última fila) y búsqueda. */
export const listaSchema = z.object({
  q: z.string().trim().max(120).optional().describe("Texto a buscar (nombre, RUT…)."),
  cursor: z.uuid().optional().describe("Id de la última fila de la página anterior."),
  limite: z.number().int().min(1).max(100).default(50),
  incluirArchivadas: z.boolean().default(false),
});

/**
 * Página por cursor (CAR-400). Sin `skip: 1`: Prisma ubica la fila del cursor aunque ya no cumpla el
 * filtro, y si dejó de cumplirlo `skip: 1` se comía la primera fila válida de la página siguiente.
 * Se pide una fila de más por el cursor (`cursorDe`) y aquí se descarta solo si vino.
 */
export function pagina<T extends { id: string }>(
  filas: T[],
  limite: number,
  cursor: string | undefined,
) {
  const resto = cursor && filas[0]?.id === cursor ? filas.slice(1) : filas;
  const items = resto.slice(0, limite);
  return { items, siguiente: resto.length > limite ? (items.at(-1)?.id ?? null) : null };
}

/** Tramo de la consulta: `take` y cursor (incluida su propia fila, que `pagina` descarta). */
export const cursorDe = (cursor: string | undefined, limite: number) =>
  cursor ? { cursor: { id: cursor }, take: limite + 2 } : { take: limite + 1 };

/** Escritura con su evento de dominio en la misma transacción (outbox, ADR-029). */
export async function escribirConEvento<T extends { id: string }>(
  ctx: Contexto,
  evento: { tipo: string; entidadTipo: string; payload?: (r: T) => unknown },
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return ctx.transaccion(async (tx) => {
    const r = await fn(tx);
    await ctx.eventos.emitir(tx, {
      tipo: evento.tipo,
      entidadTipo: evento.entidadTipo,
      entidadId: r.id,
      payload: evento.payload?.(r) ?? {},
    });
    return r;
  });
}

/** Traduce la violación de un índice único (carrera entre dos escrituras) a CONFLICT. */
export async function sinDuplicado<T>(p: Promise<T>, mensaje: string): Promise<T> {
  try {
    return await p;
  } catch (e) {
    const code = (e as { code?: unknown } | null)?.code;
    if (code === "P2002") throw conflicto(mensaje);
    throw e;
  }
}

/** Quita las claves `undefined` (Prisma con exactOptionalPropertyTypes). */
export function definidos<T extends Record<string, unknown>>(o: T) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };
}

/** Filtro "distinto de este id" (sin id no filtra: un uuid vacío rompe la consulta en Postgres). */
export const otroQue = (id?: string) => (id ? { id: { not: id } } : {});

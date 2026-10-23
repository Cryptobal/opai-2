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
  cursor: z.string().optional().describe("Id de la última fila de la página anterior."),
  limite: z.number().int().min(1).max(100).default(50),
  incluirArchivadas: z.boolean().default(false),
});

export function pagina<T extends { id: string }>(filas: T[], limite: number) {
  const items = filas.slice(0, limite);
  return { items, siguiente: filas.length > limite ? (items.at(-1)?.id ?? null) : null };
}

export const cursorDe = (cursor?: string) => (cursor ? { cursor: { id: cursor }, skip: 1 } : {});

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

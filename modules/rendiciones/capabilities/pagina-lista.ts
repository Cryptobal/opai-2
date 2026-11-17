import { z } from "zod";

import type { Contexto } from "@opai/capabilities";

import { estadoSchema, uuidSchema } from "./esquemas";
import { nombresDe } from "./vista";

export const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD.");

/** Campos comunes de `defineCapability` para listas paginadas de rendiciones. */
export const metaListaLectura = {
  efecto: "lectura" as const,
  dryRun: false as const,
  auditarLectura: (s: { items: { id: string }[] }) => s.items.map((r) => r.id),
};

export const entradaPaginaSchema = z.object({
  cursor: uuidSchema.optional().describe("Id de la última rendición de la página anterior."),
  limite: z.number().int().min(1).max(200).default(50),
});

export const filtrosListaSchema = z.object({
  q: z.string().trim().max(120).optional().describe("Código REN-n, descripción o nombre de quien rinde."),
  estado: estadoSchema.optional(),
  solicitanteId: uuidSchema.optional(),
  instalacionId: uuidSchema.optional(),
  centroCosto: z.enum(["instalacion", "administracion"]).optional(),
  desde: fechaSchema.optional(),
  hasta: fechaSchema.optional(),
});

type Filtros = z.infer<typeof filtrosListaSchema>;

function cursorDe(cursor: string | undefined, limite: number) {
  return cursor ? { cursor: { id: cursor }, take: limite + 2 } : { take: limite + 1 };
}

function pagina<T extends { id: string }>(filas: T[], limite: number, cursor: string | undefined) {
  const resto = cursor && filas[0]?.id === cursor ? filas.slice(1) : filas;
  const items = resto.slice(0, limite);
  return { items, siguiente: resto.length > limite ? (items.at(-1)?.id ?? null) : null };
}

const ordenCodigoDesc = [{ codigo: "desc" as const }, { id: "desc" as const }];

function takePagina(cursor: string | undefined, limite: number) {
  return { orderBy: ordenCodigoDesc, ...cursorDe(cursor, limite) };
}

export async function rendicionesDePagina(
  ctx: Contexto,
  where: NonNullable<Parameters<Contexto["db"]["rendicion"]["findMany"]>[0]>["where"],
  cursor: string | undefined,
  limite: number,
) {
  const filas = await ctx.db.rendicion.findMany({ where, ...takePagina(cursor, limite) });
  return pagina(filas, limite, cursor);
}

export async function lotesDePagina(
  ctx: Contexto,
  where: NonNullable<Parameters<Contexto["db"]["lotePago"]["findMany"]>[0]>["where"],
  cursor: string | undefined,
  limite: number,
) {
  const filas = await ctx.db.lotePago.findMany({ where, ...takePagina(cursor, limite) });
  return pagina(filas, limite, cursor);
}

const codigoDe = (q: string) => {
  const m = /^ren-?(\d+)$/i.exec(q.trim());
  return m ? Number.parseInt(m[1]!, 10) : null;
};

async function idsPorNombre(ctx: Contexto, q: string): Promise<string[]> {
  const u = await ctx.db.user.findMany({
    where: { name: { contains: q, mode: "insensitive" }, memberships: { some: { tenantId: ctx.tenantId } } },
    select: { id: true },
    take: 40,
  });
  return u.map((x) => x.id);
}

export async function dondeBusqueda(ctx: Contexto, f: Filtros) {
  const partes: Record<string, unknown>[] = [];
  if (f.estado) partes.push({ estado: f.estado });
  if (f.solicitanteId) partes.push({ solicitanteId: f.solicitanteId });
  if (f.instalacionId) partes.push({ instalacionId: f.instalacionId });
  if (f.centroCosto) partes.push({ centroCosto: f.centroCosto });
  const fecha = (d: string) => new Date(`${d}T00:00:00.000Z`);
  if (f.desde || f.hasta) {
    partes.push({
      createdAt: {
        ...(f.desde ? { gte: fecha(f.desde) } : {}),
        ...(f.hasta ? { lt: new Date(fecha(f.hasta).getTime() + 86_400_000) } : {}),
      },
    });
  }
  if (f.q) {
    const codigo = codigoDe(f.q);
    const ids = await idsPorNombre(ctx, f.q);
    partes.push({
      OR: [
        ...(codigo !== null ? [{ codigo }] : []),
        { descripcion: { contains: f.q, mode: "insensitive" } },
        ...(ids.length ? [{ solicitanteId: { in: ids } }] : []),
      ],
    });
  }
  return partes.length ? { AND: partes } : {};
}

export async function contadoresPropias(ctx: Contexto, yo: string) {
  const g = await ctx.db.rendicion.groupBy({
    by: ["estado"],
    where: { solicitanteId: yo },
    _count: true,
  });
  return Object.fromEntries(g.map((x) => [x.estado, x._count])) as Record<string, number>;
}

type FilaPersonas = { aprobadorId: string | null; solicitanteId: string };

export async function mapResumenes<T extends FilaPersonas, R>(
  ctx: Contexto,
  filas: T[],
  mapper: (f: T, nombres: ReadonlyMap<string, string>) => R,
): Promise<R[]> {
  const nombres = await nombresDe(
    ctx,
    filas.flatMap((f) => [f.aprobadorId, f.solicitanteId]),
  );
  return filas.map((f) => mapper(f, nombres));
}
import type { Prisma } from "@opai/db";

import type { Contexto } from "../../types";
import { aFecha } from "../maestros/comun";

export const ORDENES = ["recientes", "nombre", "vence"] as const;
export type Orden = (typeof ORDENES)[number];

const DIA_MS = 86_400_000;
/** Días de alerta de un documento sin tipo (el mismo que `vistaDocumento`). */
const ALERTA_DEFECTO = 30;

/**
 * Estado de vigencia traducido a la consulta: depende de los días de alerta de cada tipo, así que
 * se agrupan los tipos por sus días y cada grupo lleva su ventana. Es la misma regla que
 * `estadoVigencia` (vencido < hoy; por vencer hasta hoy + alerta; vigente después), evaluada en la
 * consulta para que la paginación y el total cuenten solo lo que corresponde.
 */
export async function dondeVigencia(
  ctx: Contexto,
  vigencia: "vigente" | "por_vencer" | "vencido" | "sin_fecha",
  hoyIso: string,
): Promise<Prisma.DocumentoWhereInput> {
  if (vigencia === "sin_fecha") return { venceEn: null };
  const hoy = aFecha(hoyIso);
  if (vigencia === "vencido") return { venceEn: { lt: hoy } };
  const tipos = await ctx.db.documentoTipo.findMany({ select: { id: true, diasAlerta: true } });
  const grupos = new Map<number, string[]>([[ALERTA_DEFECTO, []]]);
  for (const t of tipos) grupos.set(t.diasAlerta, [...(grupos.get(t.diasAlerta) ?? []), t.id]);
  return {
    OR: [...grupos].map(([dias, ids]): Prisma.DocumentoWhereInput => {
      const limite = new Date(hoy.getTime() + dias * DIA_MS);
      const tipo: Prisma.DocumentoWhereInput =
        dias === ALERTA_DEFECTO
          ? { OR: [{ tipoId: null }, { tipoId: { in: ids } }] }
          : { tipoId: { in: ids } };
      const fecha: Prisma.DocumentoWhereInput =
        vigencia === "por_vencer"
          ? { venceEn: { gte: hoy, lte: limite } }
          : { venceEn: { gt: limite } };
      return { AND: [tipo, fecha] };
    }),
  };
}

/** Búsqueda por texto en los metadatos: nombre de archivo, título y etiquetas (no el contenido). */
export function dondeTexto(q: string): Prisma.DocumentoWhereInput {
  return {
    OR: [
      { nombre: { contains: q, mode: "insensitive" } },
      { titulo: { contains: q, mode: "insensitive" } },
      { etiquetas: { has: q.toLowerCase() } },
    ],
  };
}

/** Orden estable (siempre desempata por id) para que el cursor no repita ni salte filas. */
export function ordenDe(o: Orden): Prisma.DocumentoOrderByWithRelationInput[] {
  if (o === "nombre") return [{ nombre: "asc" }, { id: "asc" }];
  if (o === "vence")
    return [{ venceEn: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }, { id: "asc" }];
  return [{ createdAt: "desc" }, { id: "desc" }];
}

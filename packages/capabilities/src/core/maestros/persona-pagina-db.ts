import type { Prisma } from "@opai/db";

import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { cursorDe, pagina } from "./comun";

/** Consulta paginada de personas con vínculo vigente (CAR-353 / CAR-633). */
export async function consultaPersonasPaginada(
  ctx: Contexto,
  where: Prisma.PersonaWhereInput,
  cursor: string | undefined,
  limite: number,
  opts: { instalacion?: boolean } = {},
) {
  if (cursor) {
    const ancla = await ctx.db.persona.findFirst({ where: { AND: [where, { id: cursor }] } });
    if (!ancla) throw noEncontrado("La página pedida");
  }
  const filas = await ctx.db.persona.findMany({
    where,
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }, { id: "asc" }],
    ...cursorDe(cursor, limite),
    include: {
      vinculos: {
        where: { estado: "vigente" },
        include: {
          cargo: { select: { nombre: true } },
          ...(opts.instalacion ? { instalacion: { select: { nombre: true } } } : {}),
        },
        take: 1,
      },
    },
  });
  return pagina(filas, limite, cursor);
}
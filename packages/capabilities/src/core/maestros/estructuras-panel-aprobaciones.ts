import type { Prisma } from "@opai/db";
import { PERMISOS_CORE } from "@opai/domain";
import type { Contexto } from "../../types";
import type { EntradaPanel } from "./estructuras-panel-schema";

/** La banda comparte la carga de ficha: sin permiso ni alcance global, no carga aprobaciones. */
export function selectAprobacionesPanel(ctx: Contexto, input: EntradaPanel) {
  const permitido = !ctx.alcance && ctx.autorizar(PERMISOS_CORE.aprobacionesManage);
  return {
    aprobaciones: {
      where: {
        estado: "pendiente",
        OR: [
          { input: { path: ["id"], equals: input.id } },
          { input: { path: [`${input.tipo}Id`], equals: input.id } },
        ],
      },
      take: permitido ? 5 : 0,
      orderBy: { createdAt: "desc" },
    },
    apiKeys: { ...(permitido ? {} : { take: 0 }), select: { id: true, nombre: true } },
    memberships: {
      ...(permitido ? {} : { take: 0 }),
      select: { userId: true, user: { select: { name: true } } },
    },
  } satisfies Prisma.TenantSelect;
}

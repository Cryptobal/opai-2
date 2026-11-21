import {
  alcanceSupervisorParaRegla,
  armarContextoPortalesVisibles,
  puedeUsarPortal,
} from "@opai/domain";

import type { Contexto } from "../../types";
import { cursorDe } from "../maestros/comun";
import { rolVisible } from "./objetivo";

type Item = { id: string; nombre: string; detalle: string | null };
type Tramo = { q: string; cursor: string | undefined; limite: number };

export async function listarSupervisoresVerComo(
  ctx: Contexto,
  { q, cursor, limite }: Tramo,
): Promise<Item[]> {
  const asignados = new Set(
    (
      await ctx.db.supervisorInstalacion.findMany({
        select: { membershipId: true },
        distinct: ["membershipId"],
      })
    ).map((f) => f.membershipId),
  );
  const filas = await ctx.db.membership.findMany({
    where: {
      tenantId: ctx.tenantId,
      estado: "activa",
      portales: { has: "supervisor" },
      OR: [{ rol: "supervisor" }, { id: { in: [...asignados] } }],
    },
    select: { id: true, userId: true, rol: true, portales: true },
    orderBy: { id: "asc" },
    ...cursorDe(cursor, limite),
  });
  const visibles = filas.filter(
    (m) =>
      rolVisible(ctx, m.rol) &&
      m.userId !== ctx.usuario?.id &&
      puedeUsarPortal(
        "supervisor",
        armarContextoPortalesVisibles({
          portalesMembresia: m.portales,
          rol: m.rol,
          modulosActivos: [],
          instalaciones: alcanceSupervisorParaRegla(m.rol, asignados.has(m.id)),
          personaVinculada: false,
        }),
      ),
  );
  const usuarios = await ctx.db.user.findMany({
    where: { id: { in: visibles.map((m) => m.userId) } },
    select: { id: true, name: true },
  });
  const filtro = q.toLowerCase();
  return visibles
    .map((m) => ({
      id: m.id,
      nombre: usuarios.find((u) => u.id === m.userId)?.name ?? "Supervisor",
      detalle: m.rol === "supervisor" ? null : "Por instalación",
    }))
    .filter((i) => !filtro || i.nombre.toLowerCase().includes(filtro));
}
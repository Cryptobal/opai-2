// Alcance por filas de los documentos (ADR-022, Brief 07c B3). Un documento es visible para un
// supervisor si alguno de sus vínculos apunta a una entidad a su cargo: la instalación, su cuenta o
// un puesto de la instalación. Las personas quedan fuera hasta el Brief 07b (sin relación real
// persona ↔ instalación), igual que los documentos de empresa (nivel tenant). Ver PR-BODY.md.
import type { Contexto } from "../../types";
import { instalacionesEnAlcance } from "../maestros/alcance";

/** Ids de documentos visibles para un actor acotado, o null si ve todo el tenant. */
export async function documentosEnAlcance(ctx: Contexto): Promise<readonly string[] | null> {
  const ids = instalacionesEnAlcance(ctx);
  if (!ids) return null;
  if (!ids.length) return [];
  const instalacionIds = [...ids];
  const [insts, puestos] = await Promise.all([
    ctx.db.instalacion.findMany({ where: { id: { in: instalacionIds } }, select: { cuentaId: true } }),
    ctx.db.puesto.findMany({ where: { instalacionId: { in: instalacionIds } }, select: { id: true } }),
  ]);
  const cuentaIds = [...new Set(insts.map((i) => i.cuentaId))];
  const puestoIds = puestos.map((p) => p.id);
  const vinculos = await ctx.db.documentoVinculo.findMany({
    where: {
      OR: [
        { entidadTipo: "instalacion", entidadId: { in: instalacionIds } },
        { entidadTipo: "cuenta", entidadId: { in: cuentaIds } },
        { entidadTipo: "puesto", entidadId: { in: puestoIds } },
      ],
    },
    select: { documentoId: true },
  });
  return [...new Set(vinculos.map((v) => v.documentoId))];
}

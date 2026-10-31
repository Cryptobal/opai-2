import { type SugerenciaCentro, sugerirCentroCosto } from "@opai/domain";

import type { Contexto } from "../types";
import { vistaCompra } from "./vistas-compra";

type FilaConProveedor = Parameters<typeof vistaCompra>[0] & {
  proveedor: { rut: string; razonSocial: string; plazoPagoDias: number; centroCostoId: string | null };
};

/**
 * Arma las vistas del libro: nombre del centro asignado y, para las compras sin centro, la sugerencia
 * (defecto del proveedor, o centro de su última compra). Dos consultas para toda la página, no una por fila.
 */
export async function vistasDeCompras(ctx: Contexto, filas: readonly FilaConProveedor[]) {
  const sinCentro = filas.filter((f) => !f.centroCostoId);
  const proveedorIds = [...new Set(sinCentro.map((f) => f.proveedorId))];
  const ultimas = proveedorIds.length
    ? await ctx.db.documentoRecibido.findMany({
        where: { proveedorId: { in: proveedorIds }, centroCostoId: { not: null } },
        orderBy: [{ proveedorId: "asc" }, { fechaEmision: "desc" }, { id: "desc" }],
        distinct: ["proveedorId"],
        select: { proveedorId: true, centroCostoId: true },
      })
    : [];
  const ultimaDe = new Map(ultimas.map((u) => [u.proveedorId, u.centroCostoId]));
  const sugerenciaDe = (f: FilaConProveedor): SugerenciaCentro | null =>
    sugerirCentroCosto({
      centroProveedor: f.proveedor.centroCostoId,
      centroUltimaCompra: ultimaDe.get(f.proveedorId) ?? null,
    });
  const ids = new Set<string>();
  for (const f of filas) {
    if (f.centroCostoId) ids.add(f.centroCostoId);
    else {
      const s = sugerenciaDe(f);
      if (s) ids.add(s.centroCostoId);
    }
  }
  const centros = ids.size
    ? await ctx.db.centroCosto.findMany({ where: { id: { in: [...ids] } }, select: { id: true, nombre: true } })
    : [];
  const nombreDe = new Map(centros.map((c) => [c.id, c.nombre]));
  return filas.map((f) =>
    vistaCompra(
      f,
      f.proveedor,
      f.centroCostoId ? (nombreDe.get(f.centroCostoId) ?? null) : null,
      sugerenciaDe(f),
    ),
  );
}

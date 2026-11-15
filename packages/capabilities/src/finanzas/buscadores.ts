import { NOMBRE_TIPO_DTE_VENTA, type TipoDteVenta } from "@opai/domain";

import type { Buscador } from "../core/maestros/buscadores";
import { PERMISO_READ } from "./comun";

const MAX = 5;
const clp = (n: number) => `$${new Intl.NumberFormat("es-CL").format(n)}`;
const contiene = (q: string) => ({ contains: q, mode: "insensitive" as const });

/** Folio o monto: solo dígitos, con `$`, puntos o espacios opcionales. */
function numeroDe(q: string): number | null {
  const limpio = q.replace(/[$\s.]/g, "").replace(",", "");
  if (!/^\d{1,12}$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Aporte de Finanzas a ⌘K (CAR-526): DTE por folio, cliente o monto; exige `finanzas:read`. */
export const buscadoresFinanzas: readonly Buscador[] = [
  {
    modulo: "finanzas",
    grupo: "facturas",
    titulo: "Facturas",
    permiso: PERMISO_READ,
    async buscar(ctx, q) {
      const n = numeroDe(q);
      const rut = q.replace(/[.\s]/g, "").toUpperCase();
      const cuentas = await ctx.db.cuenta.findMany({
        where: {
          OR: [{ nombre: contiene(q) }, { razonSocial: contiene(q) }, { rut: { startsWith: rut } }],
        },
        select: { id: true, nombre: true },
        take: 20,
      });
      const or = [
        ...(n ? [{ folio: n }, { montoTotal: n }] : []),
        ...(cuentas.length ? [{ cuentaId: { in: cuentas.map((c) => c.id) } }] : []),
      ];
      if (!or.length) return [];
      const filas = await ctx.db.documentoEmitido.findMany({
        where: { OR: or },
        orderBy: [{ fechaEmision: "desc" }, { id: "desc" }],
        take: MAX,
        select: { id: true, tipoDte: true, folio: true, montoTotal: true, cuentaId: true },
      });
      const nombreDe = new Map(cuentas.map((c) => [c.id, c.nombre]));
      const faltan = [...new Set(filas.map((f) => f.cuentaId).filter((id) => !nombreDe.has(id)))];
      if (faltan.length) {
        const extras = await ctx.db.cuenta.findMany({
          where: { id: { in: faltan } },
          select: { id: true, nombre: true },
        });
        for (const c of extras) nombreDe.set(c.id, c.nombre);
      }
      return filas.map((f) => {
        const tipo = NOMBRE_TIPO_DTE_VENTA[f.tipoDte as TipoDteVenta] ?? `DTE ${f.tipoDte}`;
        return {
          id: f.id,
          titulo: f.folio != null ? `${tipo} ${f.folio}` : `${tipo} (borrador)`,
          detalle: `${nombreDe.get(f.cuentaId) ?? "Cliente"} · ${clp(f.montoTotal)}`,
          href: `/finanzas/ventas/${f.id}`,
        };
      });
    },
  },
];

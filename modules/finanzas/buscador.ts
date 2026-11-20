import { type Buscador, type Contexto } from "@opai/capabilities";
import { formatearClp, NOMBRE_TIPO_DTE_VENTA, type TipoDteVenta } from "@opai/domain";

const MAX = 5;
const PERMISO_READ = "finanzas:read";
const contiene = (q: string) => ({ contains: q, mode: "insensitive" as const });

/** «102» o «folio 102»: el folio buscado, o null si el texto no es un número. */
export function folioDeBusqueda(q: string): number | null {
  const m = /^\s*(?:folio\s*)?(\d{1,9})\s*$/i.exec(q);
  return m ? Number(m[1]) : null;
}

/** Monto en pesos: solo dígitos, con `$`, puntos o espacios opcionales (CAR-526). */
function montoDeBusqueda(q: string): number | null {
  const limpio = q.replace(/[$\s.]/g, "").replace(",", "");
  if (!/^\d{1,12}$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Nombre visible de las cuentas (clientes) de esta empresa, por id. */
async function nombresDeCuentas(ctx: Contexto, where: object): Promise<Map<string, string>> {
  const cs = await ctx.db.cuenta.findMany({ where, select: { id: true, nombre: true, razonSocial: true }, take: 50 });
  return new Map(cs.map((c) => [c.id, c.razonSocial ?? c.nombre]));
}

/** Aporte de Finanzas a la búsqueda global (CAR-402, parte 2 de CAR-301): documentos de venta y proveedores. */
export const buscadoresFinanzas: readonly Buscador[] = [
  {
    modulo: "finanzas",
    grupo: "facturas",
    titulo: "Facturas y notas",
    permiso: PERMISO_READ,
    async buscar(ctx, q) {
      const folio = folioDeBusqueda(q);
      const monto = montoDeBusqueda(q);
      const rut = q.replace(/[.\s]/g, "").toUpperCase();
      const cuentas = await nombresDeCuentas(ctx, {
        OR: [
          { nombre: contiene(q) },
          { razonSocial: contiene(q) },
          ...(/^[0-9]{2,8}(?:-[0-9K]?)?$/.test(rut) ? [{ rut: { startsWith: rut } }] : []),
        ],
      });
      const coincide = [
        ...(folio !== null ? [{ folio }] : []),
        ...(monto !== null ? [{ montoTotal: monto }] : []),
        ...(cuentas.size ? [{ cuentaId: { in: [...cuentas.keys()] } }] : []),
      ];
      if (!coincide.length) return [];
      const filas = await ctx.db.documentoEmitido.findMany({
        where: { OR: coincide },
        select: { id: true, tipoDte: true, folio: true, montoTotal: true, cuentaId: true },
        orderBy: [{ fechaEmision: { sort: "desc", nulls: "first" } }, { id: "desc" }],
        take: MAX,
      });
      const faltan = [...new Set(filas.map((f) => f.cuentaId).filter((id) => !cuentas.has(id)))];
      if (faltan.length) for (const [id, n] of await nombresDeCuentas(ctx, { id: { in: faltan } })) cuentas.set(id, n);
      return filas.map((f) => {
        const tipo = NOMBRE_TIPO_DTE_VENTA[f.tipoDte as TipoDteVenta] ?? `DTE ${f.tipoDte}`;
        return {
          id: f.id,
          titulo: f.folio ? `${tipo} ${f.folio}` : `${tipo} · borrador`,
          detalle: `${cuentas.get(f.cuentaId) ?? "Cliente"} · ${formatearClp(f.montoTotal)}`,
          href: `/finanzas/ventas/${f.id}`,
        };
      });
    },
  },
  {
    modulo: "finanzas",
    grupo: "proveedores",
    titulo: "Proveedores",
    permiso: PERMISO_READ,
    async buscar(ctx, q) {
      const filas = await ctx.db.proveedor.findMany({
        where: { razonSocial: contiene(q) },
        select: { id: true, razonSocial: true, giro: true, activo: true },
        orderBy: [{ activo: "desc" }, { razonSocial: "asc" }],
        take: MAX,
      });
      return filas.map((p) => ({
        id: p.id,
        titulo: p.razonSocial,
        detalle: p.activo ? p.giro : "Archivado",
        href: `/finanzas/compras/proveedores/${p.id}`,
      }));
    },
  },
];

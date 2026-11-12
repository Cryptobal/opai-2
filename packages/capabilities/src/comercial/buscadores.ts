import type { Buscador } from "../core/maestros/buscadores";
import { PERMISO_READ } from "./comun";
import { PERMISO_SOLICITUDES_READ } from "./solicitudes-comun";

const MAX = 5;
const contiene = (q: string) => ({ contains: q, mode: "insensitive" as const });

/** Aporte de Comercial a la búsqueda global (CAR-301): negocios y solicitudes. */
export const buscadoresComercial: readonly Buscador[] = [
  {
    grupo: "negocios",
    titulo: "Negocios",
    permiso: PERMISO_READ,
    async buscar(ctx, q) {
      const filas = await ctx.db.negocio.findMany({
        where: { archivadoEn: null, titulo: contiene(q) },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: MAX,
      });
      return filas.map((n) => ({ id: n.id, titulo: n.titulo, detalle: n.estado === "abierto" ? null : n.estado, href: `/negocios/${n.id}` }));
    },
  },
  {
    grupo: "solicitudes",
    titulo: "Solicitudes",
    permiso: PERMISO_SOLICITUDES_READ,
    async buscar(ctx, q) {
      const filas = await ctx.db.solicitud.findMany({
        where: { OR: [{ nombre: contiene(q) }, { empresa: contiene(q) }, { email: contiene(q) }, { asunto: contiene(q) }] },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: MAX,
      });
      return filas.map((s) => ({
        id: s.id,
        titulo: s.asunto ?? s.empresa ?? s.nombre ?? "Solicitud sin asunto",
        detalle: s.empresa ?? s.nombre ?? null,
        href: `/solicitudes/${s.id}`,
      }));
    },
  },
];

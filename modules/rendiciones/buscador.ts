import type { Buscador, Contexto } from "@opai/capabilities";

import { codigoVisible } from "./domain";
import { PERMISO_RENDIR, PERMISO_VER_TODAS } from "./capabilities/permisos";

const MAX = 5;
const ESTADO: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  devuelta: "Devuelta",
  pagada: "Pagada",
  anulada: "Anulada",
};

/** «REN-12», «ren 12» o «12»: el número de la rendición, o null si el texto no lo es. */
export function codigoDeBusqueda(q: string): number | null {
  const m = /^\s*(?:ren[\s-]*)?(\d{1,9})\s*$/i.exec(q);
  return m ? Number(m[1]) : null;
}

/**
 * Alcance de filas (ADR-022) en la consulta: con «ver todas», toda la empresa; si no, solo lo que rindió
 * o le toca aprobar a quien busca. Sin usuario (sistema o agente sin persona) y sin «ver todas», nada.
 */
function alcance(ctx: Contexto): { OR?: object[] } | null {
  if (ctx.autorizar(PERMISO_VER_TODAS)) return {};
  const yo = ctx.usuario?.id;
  return yo ? { OR: [{ solicitanteId: yo }, { aprobadorId: yo }] } : null;
}

/** Personas de esta empresa cuyo nombre contiene el texto (nunca usuarios de otra empresa). */
async function personasQueCalzan(ctx: Contexto, q: string): Promise<Map<string, string>> {
  const u = await ctx.db.user.findMany({
    where: { name: { contains: q, mode: "insensitive" }, memberships: { some: { tenantId: ctx.tenantId } } },
    select: { id: true, name: true },
    take: 50,
  });
  return new Map(u.map((x) => [x.id, x.name]));
}

/** Aporte de Rendiciones a la búsqueda global (CAR-403, parte 2 de CAR-301): por número, descripción o persona. */
export const buscadoresRendiciones: readonly Buscador[] = [
  {
    modulo: "rendiciones",
    grupo: "rendiciones",
    titulo: "Rendiciones",
    permiso: PERMISO_RENDIR,
    async buscar(ctx, q) {
      const filtro = alcance(ctx);
      if (!filtro) return [];
      const codigo = codigoDeBusqueda(q);
      const personas = await personasQueCalzan(ctx, q);
      const coincide = [
        { descripcion: { contains: q, mode: "insensitive" as const } },
        ...(codigo !== null ? [{ codigo }] : []),
        ...(personas.size ? [{ solicitanteId: { in: [...personas.keys()] } }] : []),
      ];
      const filas = await ctx.db.rendicion.findMany({
        where: { AND: [filtro, { OR: coincide }] },
        select: { id: true, codigo: true, descripcion: true, estado: true, solicitanteId: true },
        orderBy: [{ codigo: "desc" }],
        take: MAX,
      });
      const faltan = filas.map((f) => f.solicitanteId).filter((id) => !personas.has(id));
      if (faltan.length) {
        const extra = await ctx.db.user.findMany({
          where: { id: { in: [...new Set(faltan)] }, memberships: { some: { tenantId: ctx.tenantId } } },
          select: { id: true, name: true },
        });
        for (const x of extra) personas.set(x.id, x.name);
      }
      return filas.map((f) => ({
        id: f.id,
        titulo: `${codigoVisible(f.codigo)} · ${f.descripcion}`,
        detalle: [personas.get(f.solicitanteId), ESTADO[f.estado] ?? f.estado].filter(Boolean).join(" · ") || null,
        href: `/rendiciones/${f.id}`,
      }));
    },
  },
];

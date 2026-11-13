import { formatearClp } from "@opai/domain";
import type { Contexto, FuenteAprobaciones } from "@opai/capabilities";

import { PERMISO_APROBAR, PERMISO_VER_TODAS } from "./capabilities/permisos";
import { nombresDe } from "./capabilities/vista";
import { codigoVisible } from "./domain";

/** Igual que la bandeja del aprobador (ADR-022): lo asignado al actor; `ver_todas`, las de la empresa. */
function donde(ctx: Contexto) {
  const yo = ctx.actor.tipo === "user" ? ctx.actor.id : (ctx.actor.viaUserId ?? "");
  return { estado: "enviada", ...(ctx.autorizar(PERMISO_VER_TODAS) ? {} : { aprobadorId: yo }) };
}

/** Aporte de Rendiciones a «Por aprobar» (CAR-253): rendiciones enviadas que esperan decisión. */
export const fuentesAprobacionRendiciones: readonly FuenteAprobaciones[] = [
  {
    modulo: "rendiciones",
    origen: "rendiciones",
    titulo: "Rendiciones",
    permisos: [PERMISO_APROBAR],
    contar: (ctx) => ctx.db.rendicion.count({ where: donde(ctx) }),
    async listar(ctx, limite) {
      const filas = await ctx.db.rendicion.findMany({
        where: donde(ctx),
        orderBy: { enviadaEn: "asc" },
        take: limite,
      });
      const nombres = await nombresDe(
        ctx,
        filas.map((f) => f.solicitanteId),
      );
      return filas.map((f) => ({
        id: f.id,
        resumen: `Rendición · ${codigoVisible(f.codigo)} · ${nombres.get(f.solicitanteId) ?? "Sin nombre"} · ${formatearClp(f.montoTotal)}`,
        href: `/rendiciones/bandeja/${f.id}`,
        creadaEn: (f.enviadaEn ?? f.createdAt).toISOString(),
      }));
    },
  },
];

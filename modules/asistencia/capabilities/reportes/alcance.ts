import { prohibido, type Contexto } from "@opai/capabilities";

/** Alcance por instalación para reportes DT (permiso `asistencia:reportes`, ADR-022). */
export function alcanceReportes(ctx: Contexto): { instalacionId?: { in: string[] } } {
  if (!ctx.autorizar("asistencia:reportes")) {
    throw prohibido("Ver y exportar reportes DT exige el permiso asistencia:reportes.");
  }
  if (ctx.alcance?.instalaciones.length) return { instalacionId: { in: [...ctx.alcance.instalaciones] } };
  return {};
}
import type { Contexto } from "@opai/capabilities";

type Entrada = { cuentaId: string; alcance: "completo" | "limitado"; accesoId: string; cotizacionId?: string | undefined };

/**
 * Cotizaciones de la cuenta del contacto que el portal puede mostrar (ADR-022: el alcance va en la consulta).
 * Un acceso «completo» ve todas; uno «limitado» (prospecto, CAR-300) solo las de sus propuestas VIGENTES (estado y vigencia sin vencer, calculado al leer) y mientras
 * ni la cotización ni su negocio estén archivados (archivar oculta, restaurar devuelve; sin tareas programadas).
 */
export async function cotizacionesVisibles(ctx: Contexto, i: Entrada) {
  const limitado = i.alcance === "limitado";
  const negocios = await ctx.db.negocio.findMany({
    where: { cuentaId: i.cuentaId, ...(limitado ? { archivadoEn: null } : {}) },
    select: { id: true },
  });
  const vigentes = limitado
    ? await ctx.db.accesoPropuesta.findMany({ where: { accesoId: i.accesoId, estado: "vigente", OR: [{ vigenteHasta: null }, { vigenteHasta: { gt: new Date() } }] }, select: { cotizacionId: true } })
    : [];
  return ctx.db.cpqCotizacion.findMany({
    where: {
      negocioId: { in: negocios.map((n) => n.id) },
      ...(i.cotizacionId ? { id: i.cotizacionId } : {}),
      ...(limitado ? { archivadaEn: null, AND: [{ id: { in: vigentes.map((v) => v.cotizacionId) } }] } : {}),
    },
    select: { id: true, codigo: true, titulo: true },
  });
}

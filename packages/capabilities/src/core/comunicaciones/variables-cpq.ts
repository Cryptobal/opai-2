import type { EventoPublicado } from "../../eventos/consumidores";
import type { Contexto } from "../../types";

/** Variables de los eventos comunicables de CPQ (aprobaciones y envíos), separadas de `variables.ts`. */
export async function variablesCpq(
  ctx: Contexto,
  ev: EventoPublicado,
  p: Record<string, unknown>,
  base: string,
  empresa: { nombre: string },
): Promise<Record<string, unknown>> {
  const cotId =
    ev.entidadTipo === "cotizacion"
      ? ev.entidadId
      : ev.entidadTipo === "cotizacion_version" && ev.entidadId
        ? (
            await ctx.db.cpqVersion.findFirst({
              where: { id: ev.entidadId },
              select: { cotizacion: { select: { id: true, codigo: true } } },
            })
          )?.cotizacion
        : null;
  const codigo =
    (cotId && typeof cotId === "object" ? cotId.codigo : null) ??
    (typeof p["codigo"] === "string" ? p["codigo"] : "") ??
    (ev.entidadId
      ? ((await ctx.db.cpqCotizacion.findFirst({ where: { id: ev.entidadId } }))?.codigo ?? "")
      : "");
  const cotizacionPk =
    typeof cotId === "object" && cotId && "id" in cotId
      ? cotId.id
      : typeof ev.entidadId === "string"
        ? ev.entidadId
        : "";
  const urlBandeja = `${base}/configuracion/aprobaciones`;
  const urlCotizacion = cotizacionPk ? `${base}/cotizaciones/${cotizacionPk}` : urlBandeja;
  const solicitanteId =
    typeof p["solicitadaPorId"] === "string"
      ? p["solicitadaPorId"]
      : typeof p["solicitadoPorId"] === "string"
        ? p["solicitadoPorId"]
        : null;
  const solicitante = solicitanteId
    ? await ctx.db.user.findFirst({ where: { id: solicitanteId }, select: { name: true } })
    : null;
  const resumen =
    ev.tipo === "cpq.envio_propuesta.solicitado"
      ? `Envío propuesta · ${codigo}`
      : ev.tipo === "cpq.cotizacion.aprobacion_solicitada"
        ? `Margen · ${codigo}`
        : (typeof p["resumen"] === "string" ? p["resumen"] : codigo);
  return {
    cotizacion: { codigo },
    solicitante: { nombre: solicitante?.name ?? "Usuario" },
    resumen,
    motivo: typeof p["motivo"] === "string" ? p["motivo"] : "",
    empresa,
    url:
      ev.tipo === "cpq.cotizacion.aprobacion_solicitada" ||
      ev.tipo === "cpq.envio_propuesta.solicitado"
        ? urlBandeja
        : urlCotizacion,
  };
}

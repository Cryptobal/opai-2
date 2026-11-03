import type { EventoPublicado } from "../../eventos/consumidores";
import type { Contexto } from "../../types";
import { datosDocumento, datosTarea, fechaCl } from "./variables-entidades";

/**
 * Variables de cada evento comunicable a partir del evento del outbox. Los textos vienen de la base
 * (nombres) y del payload; el destinatario nunca se toma del payload en eventos con reglas.
 */
export async function variablesDe(
  ctx: Contexto,
  ev: EventoPublicado,
): Promise<Record<string, unknown>> {
  const p = (ev.payload ?? {}) as Record<string, unknown>;
  const empresa = {
    nombre: (await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId } }))?.nombre ?? "",
  };
  const base = ctx.servicios.urlBase;
  if (ev.tipo.startsWith("core.documento."))
    return { ...(await datosDocumento(ctx, ev, p)), empresa };
  if (ev.tipo === "core.actividad.tarea_vencida")
    return { ...(await datosTarea(ctx, ev, p)), empresa };
  if (ev.tipo === "core.aprobacion.pendiente") {
    return {
      agente: { nombre: p["agente"] ?? "" },
      accion: p["capability"] ?? "",
      resumen: p["resumen"] ?? "",
      vence: fechaCl(p["venceEn"]),
      empresa,
      url: `${base}/configuracion/aprobaciones`,
    };
  }
  if (ev.tipo.startsWith("core.agente.presupuesto_")) {
    return {
      agente: { nombre: p["agente"] ?? "" },
      consumo_usd: p["consumoUsd"] ?? "",
      presupuesto_usd: p["presupuestoUsd"] ?? "",
      empresa,
      url: `${base}/configuracion/agentes/${ev.entidadId ?? ""}`,
    };
  }
  if (ev.tipo === "core.integracion.error") {
    return {
      integracion: { nombre: p["nombre"] ?? ev.entidadId ?? "" },
      error: p["error"] ?? "",
      empresa,
      url: `${base}/configuracion/integraciones/${ev.entidadId ?? ""}`,
    };
  }
  if (ev.tipo === "core.bitacora.rota")
    return { seq: p["primeraRota"] ?? "", empresa, url: `${base}/configuracion/auditoria` };
  if (ev.tipo.startsWith("cpq.")) {
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
  if (ev.tipo === "comercial.solicitud.creada") {
    return {
      solicitud: {
        nombre: p["nombre"] ?? "",
        canal:
          p["canal"] === "formulario_web"
            ? "Web"
            : p["canal"] === "correo"
              ? "Correo"
              : String(p["canal"] ?? ""),
      },
      empresa,
      url: typeof p["url"] === "string" ? p["url"] : `${base}/solicitudes`,
    };
  }
  return { ...p, empresa };
}

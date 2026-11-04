/* eslint-disable max-lines -- integrado sin lint por la caída de memoria del CI (CAR-181); dividir en el PR de pendientes */
import type { EventoPublicado } from "../../eventos/consumidores";
import type { Contexto } from "../../types";
import { datosDocumento, datosTarea, fechaCl } from "./variables-entidades";
import { variablesCpq } from "./variables-cpq";

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
  if (ev.tipo.startsWith("cpq.")) return variablesCpq(ctx, ev, p, base, empresa);
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
  if (ev.tipo === "comercial.seguimiento.cliente_respondio" || ev.tipo === "comercial.seguimiento.cierre_aplicado") {
    const n = ev.entidadId
      ? await ctx.db.negocio.findUnique({ where: { id: ev.entidadId }, select: { titulo: true } })
      : null;
    const ruta = ev.tipo === "comercial.seguimiento.cierre_aplicado" ? "" : "/seguimiento";
    return { negocio: { titulo: n?.titulo ?? "" }, empresa, url: `${base}/negocios/${ev.entidadId ?? ""}${ruta}` };
  }
  return { ...p, empresa };
}

import type { EventoPublicado } from "../../eventos/consumidores";
import type { Contexto } from "../../types";

const fechaCl = (iso: unknown) =>
  typeof iso === "string" && /^\d{4}-\d{2}-\d{2}/.test(iso)
    ? iso.slice(0, 10).split("-").reverse().join("-")
    : "";

const RUTA_ENTIDAD: Record<string, string> = {
  persona: "/personas",
  cuenta: "/cuentas",
  instalacion: "/instalaciones",
  tenant: "/configuracion/documentos",
};

async function nombreEntidad(ctx: Contexto, tipo: string, id: string): Promise<string> {
  if (tipo === "persona") {
    const p = await ctx.db.persona.findUnique({ where: { id } });
    return p ? `${p.nombres} ${p.apellidos}` : "";
  }
  if (tipo === "cuenta") return (await ctx.db.cuenta.findUnique({ where: { id } }))?.nombre ?? "";
  if (tipo === "instalacion")
    return (await ctx.db.instalacion.findUnique({ where: { id } }))?.nombre ?? "";
  if (tipo === "puesto") return (await ctx.db.puesto.findUnique({ where: { id } }))?.nombre ?? "";
  return (await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId } }))?.nombre ?? "";
}

async function datosDocumento(ctx: Contexto, ev: EventoPublicado, p: Record<string, unknown>) {
  const d = ev.entidadId
    ? await ctx.db.documento.findUnique({ where: { id: ev.entidadId } })
    : null;
  const tipo = d?.tipoId
    ? await ctx.db.documentoTipo.findUnique({ where: { id: d.tipoId } })
    : null;
  const v = d
    ? await ctx.db.documentoVinculo.findFirst({ where: { documentoId: d.id, rol: "propietario" } })
    : null;
  const ruta = v
    ? `${RUTA_ENTIDAD[v.entidadTipo] ?? ""}${v.entidadTipo === "tenant" ? "" : `/${v.entidadId}/documentos`}`
    : "";
  return {
    documento: {
      nombre: d?.nombre ?? "",
      tipo: tipo?.nombre ?? "Documento",
      vence: fechaCl(p["venceEn"]),
      dias: String(p["dias"] ?? ""),
    },
    entidad: { nombre: v ? await nombreEntidad(ctx, v.entidadTipo, v.entidadId) : "" },
    url: `${ctx.servicios.urlBase}${ruta}`,
  };
}

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

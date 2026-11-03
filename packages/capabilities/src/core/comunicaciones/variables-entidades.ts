// Variables de los avisos de documentos y de tareas (extraídas de variables.ts por largo, CAR-162).
import type { EventoPublicado } from "../../eventos/consumidores";
import type { Contexto } from "../../types";

export const fechaCl = (iso: unknown) =>
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

export async function datosDocumento(ctx: Contexto, ev: EventoPublicado, p: Record<string, unknown>) {
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

/** Tarea vencida: título, vencimiento y la primera ficha ligada (ya validada al crear la tarea). */
export async function datosTarea(ctx: Contexto, ev: EventoPublicado, p: Record<string, unknown>) {
  const a = ev.entidadId ? await ctx.db.actividad.findFirst({ where: { id: ev.entidadId } }) : null;
  const v = a ? await ctx.db.actividadVinculo.findFirst({ where: { actividadId: a.id } }) : null;
  const nombre = v?.negocioId
    ? ((await ctx.db.negocio.findFirst({ where: { id: v.negocioId } }))?.titulo ?? "")
    : v?.cuentaId
      ? await nombreEntidad(ctx, "cuenta", v.cuentaId)
      : v?.instalacionId
        ? await nombreEntidad(ctx, "instalacion", v.instalacionId)
        : v?.contactoId
          ? await ctx.db.contacto
              .findFirst({ where: { id: v.contactoId } })
              .then((c) => (c ? `${c.nombres} ${c.apellidos}`.trim() : ""))
          : "";
  return {
    tarea: { titulo: a?.titulo ?? "", vence: fechaCl(p["vencimiento"]) },
    entidad: { nombre },
    url: `${ctx.servicios.urlBase}/tareas`,
  };
}

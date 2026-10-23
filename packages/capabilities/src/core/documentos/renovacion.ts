import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { correoDe } from "../../integraciones/adaptadores";
import { enviarCorreo } from "../comunicaciones/envio";

const EVENTO = "core.documento.renovacion_solicitada";

export const documentosPedirRenovacion = defineCapability({
  id: "core.documentos.pedir_renovacion",
  descripcion:
    "Pide a una o más personas que renueven documentos (vencidos, por vencer o faltantes) con un correo a su dirección laboral o personal, usando la plantilla editable del evento. Devuelve a quién se envió y a quién no (sin correo).",
  permiso: PERMISOS_CORE.documentosManage,
  input: z.object({
    pedidos: z
      .array(z.object({ personaId: z.uuid(), tipoIds: z.array(z.uuid()).min(1).max(20) }))
      .min(1)
      .max(200),
    mensaje: z.string().trim().max(500).optional(),
  }),
  output: z.object({
    enviados: z.array(z.object({ personaId: z.string(), para: z.string() })),
    sinCorreo: z.array(z.object({ personaId: z.string(), nombre: z.string() })),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const ids = input.pedidos.map((p) => p.personaId);
    const [personas, tipos, tenant] = await Promise.all([
      ctx.db.persona.findMany({ where: { id: { in: ids } } }),
      ctx.db.documentoTipo.findMany({
        where: { id: { in: input.pedidos.flatMap((p) => p.tipoIds) } },
      }),
      ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
    ]);
    if (personas.length !== new Set(ids).size) throw reglaDeNegocio("Alguna persona no existe.");
    const pedidosTipos = new Set(input.pedidos.flatMap((p) => p.tipoIds));
    const validos = tipos.filter((t) => t.capa === "persona" && t.activo);
    if (validos.length !== pedidosTipos.size)
      throw reglaDeNegocio("Algún tipo de documento no existe, no es de persona o está inactivo.");
    const nombreTipo = new Map(tipos.map((t) => [t.id, t.nombre]));
    const enviados: { personaId: string; para: string }[] = [];
    const sinCorreo: { personaId: string; nombre: string }[] = [];
    const correo = dryRun ? null : await correoDe(ctx);
    for (const pedido of input.pedidos) {
      const p = personas.find((x) => x.id === pedido.personaId);
      if (!p) continue;
      const para = p.emailLaboral ?? p.emailPersonal;
      if (!para) {
        sinCorreo.push({ personaId: p.id, nombre: `${p.nombres} ${p.apellidos}` });
        continue;
      }
      enviados.push({ personaId: p.id, para });
      if (!correo) continue;
      await enviarCorreo(
        { db: ctx.db, tenantId: ctx.tenantId, correo, urlBase: ctx.servicios.urlBase },
        EVENTO,
        para,
        {
          persona: { nombre: `${p.nombres} ${p.apellidos}` },
          documentos: {
            lista: pedido.tipoIds.map((t) => nombreTipo.get(t) ?? "Documento").join(", "),
          },
          mensaje: input.mensaje ?? "",
          empresa: { nombre: tenant?.nombre ?? "" },
        },
      );
    }
    return { enviados, sinCorreo };
  },
});

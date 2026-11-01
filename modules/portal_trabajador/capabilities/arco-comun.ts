import { z } from "zod";

import { ajuste, reglaDeNegocio, type Contexto } from "@opai/capabilities";
import {
  mensajeAcuseArco,
  normalizarCamposArco,
  plazoPortal,
  TIPOS_ARCO_PORTAL,
  validarDetalleArco,
  type TipoArcoPortal,
} from "@opai/domain";

import { personaPropia } from "./persona-propia";

export const arcoSolicitudSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  estado: z.string(),
  recibidaEn: z.string(),
  plazoEn: z.string().nullable(),
  mensaje: z.string(),
});

export async function crearSolicitudArcoPortal(
  ctx: Contexto,
  input: { tipo: TipoArcoPortal; detalle: string; campos?: string[] },
  dryRun: boolean,
): Promise<z.input<typeof arcoSolicitudSchema>> {
  const detalleErr = validarDetalleArco(input.detalle);
  if (detalleErr) throw reglaDeNegocio(detalleErr);
  const campos = normalizarCamposArco(input.campos);
  const persona = await personaPropia(ctx);
  const diasAjuste = await ajuste<number>(ctx, "core", "cumplimiento_solicitud_dias_plazo");
  const recibidaEn = new Date();
  const plazoEn = plazoPortal(recibidaEn, diasAjuste);
  const mensaje = mensajeAcuseArco(input.tipo);
  if (dryRun) {
    return {
      id: "",
      tipo: input.tipo,
      estado: "recibida",
      recibidaEn: recibidaEn.toISOString(),
      plazoEn: plazoEn?.toISOString() ?? null,
      mensaje,
    };
  }
  const fila = await ctx.transaccion(async (tx) => {
    const f = await tx.solicitudArco.create({
      data: {
        tenantId: ctx.tenantId,
        tipo: input.tipo,
        titularTipo: "persona",
        titularId: persona.id,
        titularEmail: persona.emailPersonal ?? persona.emailLaboral,
        titularNombre: `${persona.nombres} ${persona.apellidos}`.trim(),
        estado: "recibida",
        plazoEn,
        recibidaEn,
        detalle: input.detalle.trim(),
        campos,
      },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "core.cumplimiento.solicitud_creada",
      entidadTipo: "solicitud_arco",
      entidadId: f.id,
      payload: {
        solicitud: { tipo: f.tipo, plazo: plazoEn ? plazoEn.toISOString().slice(0, 10) : "" },
        titular: { nombre: f.titularNombre ?? "" },
        origen: "portal_trabajador",
        url: `${ctx.servicios.urlBase}/configuracion/cumplimiento`,
      },
    });
    return f;
  });
  return {
    id: fila.id,
    tipo: fila.tipo,
    estado: fila.estado,
    recibidaEn: fila.recibidaEn.toISOString(),
    plazoEn: fila.plazoEn?.toISOString() ?? null,
    mensaje,
  };
}

export const tiposArcoPortalSchema = z.enum(TIPOS_ARCO_PORTAL);

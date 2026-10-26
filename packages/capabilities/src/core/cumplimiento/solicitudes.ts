import { z } from "zod";

import {
  calcularPlazo,
  type EstadoSolicitud,
  PERMISOS_CORE,
  puedeAvanzarSolicitud,
  TIPOS_SOLICITUD,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { ajuste } from "../config";
import { uuidSchema } from "../esquemas";
import {
  cargarTitular,
  solicitudSchema,
  titularSchema,
  transicionarSolicitud,
  vistaSolicitud,
} from "./comunes";

export const solicitudCrear = defineCapability({
  id: "core.cumplimiento.solicitud_crear",
  descripcion:
    "Registra una solicitud del titular (ARCO+): acceso, rectificación, cancelación, oposición, portabilidad o bloqueo (Ley 21.719). Calcula el plazo de atención si está configurado, deja acuse y queda auditada.",
  permiso: PERMISOS_CORE.cumplimientoManage,
  soloPersonas: true,
  input: z.object({
    tipo: z.enum(TIPOS_SOLICITUD),
    titular: titularSchema.optional().describe("Titular interno, si existe."),
    titularEmail: z.string().trim().toLowerCase().pipe(z.email()).optional(),
    titularNombre: z.string().trim().max(160).optional(),
    nota: z.string().trim().max(1000).optional(),
  }),
  output: solicitudSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const titular = input.titular ? await cargarTitular(ctx, input.titular) : null;
    if (!titular && !input.titularEmail)
      throw reglaDeNegocio("Indica el titular interno o su correo.");
    const dias = await ajuste<number>(ctx, "core", "cumplimiento_solicitud_dias_plazo");
    const recibidaEn = new Date();
    const plazoEn = calcularPlazo(recibidaEn, dias);
    const base = {
      tipo: input.tipo,
      titularTipo: titular?.tipo ?? null,
      titularId: titular?.id ?? null,
      titularEmail: titular?.email ?? input.titularEmail ?? null,
      titularNombre: titular?.nombre ?? input.titularNombre ?? null,
      estado: "recibida" as const,
      plazoEn,
      recibidaEn,
      responsableId: null,
      resultado: null,
      documentoEvidenciaId: null,
    };
    if (dryRun) return vistaSolicitud({ id: "", ...base });
    const fila = await ctx.transaccion(async (tx) => {
      const f = await tx.solicitudArco.create({ data: { tenantId: ctx.tenantId, ...base } });
      await ctx.eventos.emitir(tx, {
        tipo: "core.cumplimiento.solicitud_creada",
        entidadTipo: "solicitud_arco",
        entidadId: f.id,
        payload: {
          solicitud: { tipo: f.tipo, plazo: plazoEn ? plazoEn.toISOString().slice(0, 10) : "" },
          titular: { nombre: base.titularNombre ?? "" },
          url: `${ctx.servicios.urlBase}/configuracion/cumplimiento`,
        },
      });
      return f;
    });
    return vistaSolicitud(fila);
  },
});

export const solicitudAvanzar = defineCapability({
  id: "core.cumplimiento.solicitud_avanzar",
  descripcion:
    "Toma en proceso una solicitud del titular y, opcionalmente, asigna al responsable de atenderla (Ley 21.719). La transición queda auditada para probar la atención dentro de plazo.",
  permiso: PERMISOS_CORE.cumplimientoManage,
  soloPersonas: true,
  input: z.object({
    id: uuidSchema,
    responsableId: uuidSchema.optional().describe("Usuario responsable de atender la solicitud."),
  }),
  output: solicitudSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const s = await ctx.db.solicitudArco.findUnique({ where: { id: input.id } });
    if (!s) throw noEncontrado("La solicitud");
    if (!puedeAvanzarSolicitud(s.estado as EstadoSolicitud, "en_proceso"))
      throw reglaDeNegocio(`No se puede tomar en proceso una solicitud "${s.estado}".`);
    // El responsable tiene que ser miembro activo de la empresa: la consulta va por `forTenant`
    // (solo ve membresías de este tenant), así nadie asigna a un usuario de otro tenant ni a un id
    // inventado. El alcance se valida en la consulta, nunca por el id a secas (ADR-022).
    if (input.responsableId) {
      const miembro = await ctx.db.membership.findFirst({
        where: { userId: input.responsableId, estado: "activa" },
      });
      if (!miembro) throw reglaDeNegocio("El responsable no tiene una membresía activa en la empresa.");
    }
    if (dryRun)
      return vistaSolicitud({ ...s, estado: "en_proceso", responsableId: input.responsableId ?? s.responsableId });
    const fila = await transicionarSolicitud(
      ctx,
      s.id,
      "recibida",
      { estado: "en_proceso", responsableId: input.responsableId ?? s.responsableId ?? null },
      { tipo: "core.cumplimiento.solicitud_avanzada", payload: { estado: "en_proceso" } },
    );
    return vistaSolicitud(fila);
  },
});

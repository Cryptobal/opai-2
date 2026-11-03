import { z } from "zod";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { camposSolicitud } from "./solicitudes-crear";
import {
  PERMISO_SOLICITUDES_MANAGE,
  exigirPuede,
  idSolicitud,
  solicitudDe,
  solicitudSchema,
  vistaSolicitud,
} from "./solicitudes-comun";
import { embudoPorDefecto } from "./comun";
import { aplicarConversion } from "./solicitudes-convertir-tx";
import { planSchema, resolverPlan } from "./solicitudes-convertir-plan";
import { responsableValido } from "./validaciones";

const revisados = {
  nombre: camposSolicitud.nombre,
  empresa: camposSolicitud.empresa,
  email: camposSolicitud.email,
  telefono: camposSolicitud.telefono,
  rut: camposSolicitud.rut,
  servicio: camposSolicitud.servicio,
};

export const solicitudesConvertir = defineCapability({
  id: "comercial.solicitudes.convertir",
  descripcion:
    "Convierte una solicitud en un negocio en un solo paso: reutiliza la cuenta (por RUT o por correo del contacto) o la crea, reutiliza o crea el contacto y abre el negocio en la primera etapa del embudo. Los datos enviados corrigen los de la solicitud. Con vista previa muestra qué se reutiliza y qué se crea. Un agente externo necesita aprobación humana para ejecutarla (use preview_ antes).",
  permiso: PERMISO_SOLICITUDES_MANAGE,
  exigeAprobacion: () => true,
  input: idSolicitud.extend({
    ...revisados,
    cuentaId: uuidSchema.optional().describe("Fuerza una cuenta existente en vez de buscarla."),
    titulo: z.string().trim().min(3).max(120).optional().describe("Título del negocio."),
    responsableId: uuidSchema.nullable().optional().describe("Responsable del negocio."),
  }),
  output: z.object({
    plan: planSchema,
    solicitud: solicitudSchema,
    negocioId: z.string().nullable(),
    cuentaId: z.string().nullable(),
    contactoId: z.string().nullable(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const s = await solicitudDe(ctx, input.id);
    exigirPuede(s.estado, "convertir");
    await responsableValido(ctx, input.responsableId);
    const datos = {
      nombre: input.nombre ?? s.nombre,
      empresa: input.empresa ?? s.empresa,
      email: input.email ?? s.email,
      telefono: input.telefono ?? s.telefono,
      rut: input.rut ?? s.rut,
      servicio: input.servicio ?? s.servicio,
    };
    const { cuentaNombreNueva, ...plan } = await resolverPlan(
      ctx,
      datos,
      input.titulo,
      input.cuentaId,
    );
    const ahora = new Date();
    if (dryRun) {
      return {
        plan,
        solicitud: vistaSolicitud({ ...s, ...datos, estado: "convertida", convertidaEn: ahora }),
        negocioId: null,
        cuentaId: plan.cuenta.id,
        contactoId: plan.contacto.id,
      };
    }
    const embudo = await embudoPorDefecto(ctx);
    const primera = await ctx.db.etapa.findFirst({
      where: { embudoId: embudo.id, activa: true },
      orderBy: { orden: "asc" },
    });
    if (!primera) throw reglaDeNegocio("El embudo no tiene etapas.");
    const res = await aplicarConversion(ctx, {
      solicitud: s,
      datos,
      plan,
      cuentaNombreNueva,
      responsableId: input.responsableId ?? s.responsableId ?? ctx.usuario?.id ?? null,
      embudoId: embudo.id,
      etapa: primera,
      ahora,
    });
    return {
      plan,
      solicitud: vistaSolicitud(res.sol),
      negocioId: res.negocioId,
      cuentaId: res.cuentaId,
      contactoId: res.contactoId,
    };
  },
});

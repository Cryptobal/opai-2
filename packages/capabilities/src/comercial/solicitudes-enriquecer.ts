import { z } from "zod";

import { defineCapability } from "../define";
import { prohibido, reglaDeNegocio } from "../errores";
import { definidos } from "../core/maestros/comun";
import { camposSolicitud } from "./solicitudes-crear";
import {
  CAMPOS_PROPUESTOS,
  exigirTopeEscriturasAgente,
  fusionarCamposPropuestos,
  type CampoPropuesto,
} from "./solicitudes-agente-comun";
import {
  PERMISO_SOLICITUDES_MANAGE,
  idSolicitud,
  solicitudDe,
  solicitudSchema,
  vistaSolicitud,
} from "./solicitudes-comun";

// El texto original no se toca al enriquecer: no forma parte del input.
const enriquecimiento = {
  ...z.object(camposSolicitud).omit({ textoOriginal: true }).shape,
  notasAgente: z
    .string()
    .trim()
    .max(4_000)
    .nullable()
    .optional()
    .describe("Notas internas del agente; no las escribió el consultante."),
};

export const solicitudesEnriquecer = defineCapability({
  id: "comercial.solicitudes.enriquecer",
  descripcion:
    "Actualiza los datos propuestos de una solicitud del canal agente (empresa, contacto, necesidad, fuente y notas internas) sin tocar el texto original. Solo en «nueva» o «en revisión»; un agente externo la usa tras crear la solicitud.",
  permiso: PERMISO_SOLICITUDES_MANAGE,
  input: idSolicitud.extend(enriquecimiento),
  output: solicitudSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (ctx.actor.tipo !== "agent") {
      throw prohibido("Solo un agente (API key) enriquece solicitudes por esta acción.");
    }
    const s = await solicitudDe(ctx, input.id);
    if (s.canal !== "agente") {
      throw reglaDeNegocio("Solo se enriquecen solicitudes del canal «agente».");
    }
    if (s.estado !== "nueva" && s.estado !== "en_revision") {
      throw reglaDeNegocio("Solo se enriquece una solicitud nueva o en revisión.");
    }
    const parcial: Partial<Record<CampoPropuesto, unknown>> = {};
    for (const k of CAMPOS_PROPUESTOS) {
      if (input[k] !== undefined) parcial[k] = input[k];
    }
    if (!Object.keys(parcial).length && input.notasAgente === undefined) {
      throw reglaDeNegocio("Indica al menos un campo a actualizar.");
    }
    const camposPropuestosAgente = fusionarCamposPropuestos(s.camposPropuestosAgente, parcial);
    const data = definidos({
      ...(parcial.nombre !== undefined ? { nombre: input.nombre ?? null } : {}),
      ...(parcial.empresa !== undefined ? { empresa: input.empresa ?? null } : {}),
      ...(parcial.email !== undefined ? { email: input.email ?? null } : {}),
      ...(parcial.telefono !== undefined ? { telefono: input.telefono ?? null } : {}),
      ...(parcial.rut !== undefined ? { rut: input.rut ?? null } : {}),
      ...(parcial.comuna !== undefined ? { comuna: input.comuna ?? null } : {}),
      ...(parcial.servicio !== undefined ? { servicio: input.servicio ?? null } : {}),
      ...(parcial.fuente !== undefined ? { fuente: input.fuente ?? null } : {}),
      ...(parcial.asunto !== undefined ? { asunto: input.asunto ?? null } : {}),
      ...(input.notasAgente !== undefined ? { notasAgente: input.notasAgente } : {}),
      camposPropuestosAgente,
    });
    if (dryRun) {
      return vistaSolicitud({ ...s, ...data, camposPropuestosAgente });
    }
    await exigirTopeEscriturasAgente(ctx);
    const actualizada = await ctx.transaccion(async (tx) => {
      const r = await tx.solicitud.update({ where: { id: s.id }, data });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.solicitud.enriquecida",
        entidadTipo: "solicitud",
        entidadId: r.id,
        payload: { campos: Object.keys(parcial) },
      });
      return r;
    });
    return vistaSolicitud(actualizada);
  },
});

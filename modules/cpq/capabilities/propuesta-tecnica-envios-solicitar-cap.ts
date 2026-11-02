import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { exigirDestinatariosEnvio } from "../domain/documento/propuesta-tecnica";
import { registrarEnvioPropuesta } from "../persistencia/propuesta-envio";
import { exigirGatesEnvioCpq } from "../persistencia/propuesta-envio-aprobacion";
import {
  exigirVersionDeCotizacion,
  validarDestinatariosEnvioCuenta,
} from "../persistencia/propuesta-envio-destinatarios";
import { snapshotEnvioPendiente } from "../persistencia/propuesta-envio-snapshot";
import { PERMISO_MANAGE } from "./permisos";
import { destinatarioSchema } from "./propuesta-tecnica-esquemas";
import { uuidSchema } from "./esquemas";
import { cotizacionDe } from "./util";

export const enviosPropuestaSolicitar = defineCapability({
  id: "cpq.envios_propuesta.solicitar",
  descripcion: "Prepara envío conjunto; deja pendiente de aprobación (sin congelar propuesta).",
  permiso: PERMISO_MANAGE,
  input: z.object({
    cotizacionId: uuidSchema,
    incluyeCotizacion: z.boolean().default(true),
    incluyePropuesta: z.boolean().default(false),
    propuestaTecnicaId: uuidSchema.optional(),
    destinatarios: z.array(destinatarioSchema).min(1),
    mensaje: z.string().trim().max(2000).optional(),
    confirmarValoresViejos: z.boolean().optional(),
  }),
  output: z.object({
    envioId: z.string(),
    estado: z.enum(["pendiente_aprobacion", "enviado"]),
    destinatarios: z.array(destinatarioSchema),
  }),
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, input, { dryRun }) {
    const destinatarios = exigirDestinatariosEnvio(
      input.destinatarios.map((d) => ({
        email: d.email,
        ...(d.contactoId ? { contactoId: d.contactoId } : {}),
        ...(d.nombre ? { nombre: d.nombre } : {}),
      })),
    );
    const c = await cotizacionDe(ctx, input.cotizacionId);
    const neg = await ctx.db.negocio.findFirst({
      where: { id: c.negocioId },
      select: { cuentaId: true },
    });
    await validarDestinatariosEnvioCuenta(ctx, neg?.cuentaId, destinatarios);
    if (input.incluyePropuesta && !input.propuestaTecnicaId) {
      throw reglaDeNegocio("Falta la propuesta técnica para enviar.");
    }
    if (input.propuestaTecnicaId) {
      const prop = await ctx.db.cpqPropuestaTecnica.findFirst({
        where: { id: input.propuestaTecnicaId, cotizacionId: c.id },
      });
      if (!prop) throw noEncontrado("La propuesta técnica");
    }
    const { pack } = await exigirGatesEnvioCpq(
      ctx,
      input.cotizacionId,
      input.confirmarValoresViejos,
      dryRun,
    );
    exigirVersionDeCotizacion(pack.version, c.id);
    const snapshot = snapshotEnvioPendiente(destinatarios);
    if (dryRun) {
      return {
        envioId: "00000000-0000-0000-0000-000000000000",
        estado: "pendiente_aprobacion" as const,
        destinatarios,
      };
    }
    const envio = await registrarEnvioPropuesta(ctx, {
      cotizacionId: c.id,
      versionId: pack.version.id,
      propuestaTecnicaId: input.propuestaTecnicaId ?? null,
      incluyeCotizacion: input.incluyeCotizacion,
      incluyePropuesta: input.incluyePropuesta,
      destinatariosJson: JSON.stringify(destinatarios),
      snapshot,
      ...(input.mensaje !== undefined ? { mensaje: input.mensaje } : {}),
      solicitadoPorId: ctx.actor.id ?? c.creadoPorId,
      enviado: false,
    });
    return { envioId: envio.id, estado: "pendiente_aprobacion" as const, destinatarios };
  },
});

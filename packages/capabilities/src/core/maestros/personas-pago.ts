import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { cifrarCampoEnTransaccion } from "../cumplimiento/cifrado-campos";
import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { escribirConEvento, rutSchema, sinDuplicado } from "./comun";
import { personaFicha } from "./personas-ficha-comun";
import { pagoVerSchema, solicitudPendiente, vistaPago } from "./personas-pago-vista";

export const personasPagoVer = defineCapability({
  auditarLectura: (s) => [s.personaId],
  id: "core.personas.pago_ver",
  descripcion:
    "Muestra la cuenta bancaria vigente de una persona y, si existe, la solicitud de cambio pendiente de RRHH. El supervisor ve el número enmascarado.",
  permiso: PERMISOS_CORE.personasPagoRead,
  input: z.object({ id: uuidSchema }),
  output: pagoVerSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => {
    await personaFicha(ctx, input.id);
    return vistaPago(ctx, input.id);
  },
});

const cambioInput = z.object({
  id: uuidSchema,
  bancoCodigo: z.string().trim().min(1).max(20),
  tipoCuenta: z.string().trim().min(1).max(40),
  numeroCuenta: z.string().trim().min(4).max(40),
  rutTitular: rutSchema.nullable().optional(),
});

export const personasPagoSolicitarCambio = defineCapability({
  id: "core.personas.pago_solicitar_cambio",
  descripcion:
    "Registra una solicitud de cambio de cuenta bancaria pendiente de aprobación de RRHH. No modifica la cuenta vigente hasta que la aprueben.",
  permiso: PERMISOS_CORE.personasPagoManage,
  sensibles: ["numeroCuenta"],
  input: cambioInput,
  output: pagoVerSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = await personaFicha(ctx, input.id);
    if (!ctx.usuario?.id) throw reglaDeNegocio("Se requiere un usuario autenticado.");
    const ya = await ctx.db.personaPagoSolicitud.findFirst({
      where: { personaId: p.id, estado: "pendiente" },
    });
    if (ya) throw reglaDeNegocio("Ya hay una solicitud de cambio pendiente para esta persona.");
    const data = {
      tenantId: p.tenantId,
      personaId: p.id,
      bancoCodigo: input.bancoCodigo,
      tipoCuenta: input.tipoCuenta,
      rutTitular: input.rutTitular ?? null,
      estado: "pendiente",
      solicitadoPorId: ctx.usuario.id,
    };
    if (dryRun) return vistaPago(ctx, p.id);
    await sinDuplicado(
      escribirConEvento(
        ctx,
        { tipo: "core.persona.pago_solicitud_creada", entidadTipo: "persona" },
        async (tx) => {
          const numeroCifrado = await cifrarCampoEnTransaccion(
            ctx,
            tx,
            "personas_pago_solicitudes",
            "numero_cuenta",
            input.numeroCuenta,
          );
          return tx.personaPagoSolicitud.create({ data: { ...data, numeroCuenta: numeroCifrado } });
        },
      ),
      "Ya hay una solicitud pendiente para esta persona.",
    );
    return vistaPago(ctx, p.id);
  },
});

export async function solicitudPendienteDe(ctx: Parameters<typeof personaFicha>[0], personaId: string) {
  try {
    return await solicitudPendiente(ctx, personaId);
  } catch {
    throw noEncontrado("La solicitud pendiente");
  }
}

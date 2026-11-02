import { z } from "zod";

import { cifradoDeCampos } from "../cumplimiento/cifrado-campos";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { enmascararCuenta, enmascararDatosSensiblesPersona } from "./personas-ficha-comun";

export const pagoVerSchema = z.object({
  personaId: z.string(),
  vigente: z.object({
    bancoCodigo: z.string().nullable(),
    tipoCuenta: z.string().nullable(),
    numeroCuenta: z.string().nullable(),
    rutTitular: z.string().nullable(),
  }),
  solicitudPendiente: z
    .object({
      id: z.string(),
      estado: z.string(),
      bancoCodigo: z.string().nullable(),
      tipoCuenta: z.string().nullable(),
      numeroCuenta: z.string().nullable(),
      rutTitular: z.string().nullable(),
      solicitadoPorId: z.string(),
      motivoRechazo: z.string().nullable(),
      createdAt: z.string(),
    })
    .nullable(),
});

async function descifrarNumero(
  ctx: Contexto,
  tabla: "personas_pago" | "personas_pago_solicitudes",
  guardado: string | null,
) {
  if (!guardado) return null;
  return cifradoDeCampos(ctx).descifrar(tabla, "numero_cuenta", guardado);
}

export async function vistaPago(ctx: Contexto, personaId: string) {
  const enmascarar = enmascararDatosSensiblesPersona(ctx);
  const vigente = await ctx.db.personaPago.findUnique({ where: { personaId } });
  const pendiente = await ctx.db.personaPagoSolicitud.findFirst({
    where: { personaId, estado: "pendiente" },
    orderBy: { createdAt: "desc" },
  });
  const numero = vigente?.numeroCuenta
    ? enmascararCuenta(await descifrarNumero(ctx, "personas_pago", vigente.numeroCuenta), enmascarar)
    : null;
  const pendNum = pendiente?.numeroCuenta
    ? enmascararCuenta(
        await descifrarNumero(ctx, "personas_pago_solicitudes", pendiente.numeroCuenta),
        enmascarar,
      )
    : null;
  return {
    personaId,
    vigente: {
      bancoCodigo: vigente?.bancoCodigo ?? null,
      tipoCuenta: vigente?.tipoCuenta ?? null,
      numeroCuenta: numero,
      rutTitular: vigente?.rutTitular ?? null,
    },
    solicitudPendiente: pendiente
      ? {
          id: pendiente.id,
          estado: pendiente.estado,
          bancoCodigo: pendiente.bancoCodigo,
          tipoCuenta: pendiente.tipoCuenta,
          numeroCuenta: pendNum,
          rutTitular: pendiente.rutTitular,
          solicitadoPorId: pendiente.solicitadoPorId,
          motivoRechazo: pendiente.motivoRechazo,
          createdAt: pendiente.createdAt.toISOString(),
        }
      : null,
  };
}

export async function solicitudPendiente(ctx: Contexto, personaId: string) {
  const s = await ctx.db.personaPagoSolicitud.findFirst({
    where: { personaId, estado: "pendiente" },
  });
  if (!s) throw noEncontrado("La solicitud pendiente");
  return s;
}

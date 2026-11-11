import { z } from "zod";

import {
  bancoPorCodigo,
  codigoSbif,
  etiquetaTipoCuenta,
  nombreBanco,
  tipoCuentaCanonico,
} from "@opai/domain";

import { cifradoDeCampos } from "../cumplimiento/cifrado-campos";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { enmascararCuenta, enmascararCuentaEnLectura } from "./personas-ficha-comun";

/** CAR-244: nombre del catálogo y señal de corrección para bancos o tipos guardados como texto libre. */
const catalogoSchema = {
  bancoNombre: z
    .string()
    .nullable()
    .describe("Nombre del banco según el catálogo SBIF; null si no se reconoce."),
  tipoCuentaEtiqueta: z.string().nullable(),
  porCorregir: z
    .boolean()
    .describe(
      "El banco o el tipo de cuenta guardado no está en el catálogo: hay que corregirlo a mano.",
    ),
};

export const pagoVerSchema = z.object({
  personaId: z.string(),
  vigente: z.object({
    bancoCodigo: z.string().nullable(),
    tipoCuenta: z.string().nullable(),
    numeroCuenta: z.string().nullable(),
    rutTitular: z.string().nullable(),
    ...catalogoSchema,
  }),
  solicitudPendiente: z
    .object({
      id: z.string(),
      estado: z.string(),
      bancoCodigo: z.string().nullable(),
      tipoCuenta: z.string().nullable(),
      numeroCuenta: z.string().nullable(),
      rutTitular: z.string().nullable(),
      ...catalogoSchema,
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

/** Lectura contra el catálogo; lo escrito a mano antes del selector se reconoce si se puede, pero queda por corregir. */
export function catalogoDe(banco: string | null | undefined, tipo: string | null | undefined) {
  const tipoCanon = tipoCuentaCanonico(tipo);
  return {
    bancoNombre: nombreBanco(codigoSbif(banco)),
    tipoCuentaEtiqueta: etiquetaTipoCuenta(tipoCanon),
    porCorregir: Boolean((banco && !bancoPorCodigo(banco)) || (tipo && tipoCanon !== tipo)),
  };
}

export async function vistaPago(ctx: Contexto, personaId: string) {
  const enmascarar = enmascararCuentaEnLectura(ctx);
  const vigente = await ctx.db.personaPago.findUnique({ where: { personaId } });
  const pendiente = await ctx.db.personaPagoSolicitud.findFirst({
    where: { personaId, estado: "pendiente" },
    orderBy: { createdAt: "desc" },
  });
  const numero = vigente?.numeroCuenta
    ? enmascararCuenta(
        await descifrarNumero(ctx, "personas_pago", vigente.numeroCuenta),
        enmascarar,
      )
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
      ...catalogoDe(vigente?.bancoCodigo, vigente?.tipoCuenta),
    },
    solicitudPendiente: pendiente
      ? {
          id: pendiente.id,
          estado: pendiente.estado,
          bancoCodigo: pendiente.bancoCodigo,
          tipoCuenta: pendiente.tipoCuenta,
          numeroCuenta: pendNum,
          rutTitular: pendiente.rutTitular,
          ...catalogoDe(pendiente.bancoCodigo, pendiente.tipoCuenta),
          solicitadoPorId: pendiente.solicitadoPorId,
          motivoRechazo: pendiente.motivoRechazo ?? null,
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

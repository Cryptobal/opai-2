import { z } from "zod";

import { cifradoDeCampos } from "../cumplimiento/cifrado-campos";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { enmascararCuenta, enmascararCuentaEnLectura } from "./personas-ficha-comun";
import { catalogoDe } from "./personas-pago-catalogo";

export { catalogoDe, exigirCatalogo } from "./personas-pago-catalogo";

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

const cuentaSchema = z.object({
  bancoCodigo: z.string().nullable(),
  tipoCuenta: z.string().nullable(),
  numeroCuenta: z.string().nullable(),
  rutTitular: z.string().nullable(),
  titularNombre: z.string().nullable(),
  ...catalogoSchema,
});

export const pagoVerSchema = z.object({
  personaId: z.string(),
  vigente: cuentaSchema.describe("La cuenta por defecto: la que usa la nómina de pago."),
  cuentas: z
    .array(cuentaSchema.extend({ id: z.string(), porDefecto: z.boolean() }))
    .describe("Todas las cuentas de la persona; la por defecto va primero (CAR-275)."),
  solicitudPendiente: z
    .object({
      id: z.string(),
      estado: z.string(),
      bancoCodigo: z.string().nullable(),
      tipoCuenta: z.string().nullable(),
      numeroCuenta: z.string().nullable(),
      rutTitular: z.string().nullable(),
      titularNombre: z.string().nullable(),
      tipo: z.enum(["reemplazar", "agregar", "marcar_defecto", "quitar"]),
      cuentaId: z.string().nullable(),
      porDefecto: z.boolean(),
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

export async function vistaPago(ctx: Contexto, personaId: string) {
  const enmascarar = enmascararCuentaEnLectura(ctx);
  const filas = await ctx.db.personaPago.findMany({
    where: { personaId },
    orderBy: [{ porDefecto: "desc" }, { createdAt: "asc" }],
  });
  const pendiente = await ctx.db.personaPagoSolicitud.findFirst({
    where: { personaId, estado: "pendiente" },
    orderBy: { createdAt: "desc" },
  });
  const cuentas = [];
  for (const f of filas) {
    const numero = f.numeroCuenta
      ? enmascararCuenta(await descifrarNumero(ctx, "personas_pago", f.numeroCuenta), enmascarar)
      : null;
    cuentas.push({
      id: f.id,
      porDefecto: f.porDefecto,
      bancoCodigo: f.bancoCodigo,
      tipoCuenta: f.tipoCuenta,
      numeroCuenta: numero,
      rutTitular: f.rutTitular,
      titularNombre: f.titularNombre,
      ...catalogoDe(f.bancoCodigo, f.tipoCuenta),
    });
  }
  const vigente = cuentas.find((c) => c.porDefecto);
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
      numeroCuenta: vigente?.numeroCuenta ?? null,
      rutTitular: vigente?.rutTitular ?? null,
      titularNombre: vigente?.titularNombre ?? null,
      ...catalogoDe(vigente?.bancoCodigo, vigente?.tipoCuenta),
    },
    cuentas,
    solicitudPendiente: pendiente
      ? {
          id: pendiente.id,
          estado: pendiente.estado,
          tipo: pendiente.tipo as "reemplazar" | "agregar" | "marcar_defecto" | "quitar",
          cuentaId: pendiente.cuentaId,
          porDefecto: pendiente.porDefecto,
          bancoCodigo: pendiente.bancoCodigo,
          tipoCuenta: pendiente.tipoCuenta,
          numeroCuenta: pendNum,
          rutTitular: pendiente.rutTitular,
          titularNombre: pendiente.titularNombre,
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

import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, prohibido, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "./comun";
import { personaFicha } from "./personas-ficha-comun";
import { aplicarSolicitudPago } from "./personas-pago-aplicar";
import { exigirCatalogo, vistaPago } from "./personas-pago-vista";

const motivoRechazo = z.string().trim().min(5).max(500);

export const personasPagoAprobarCambio = defineCapability({
  id: "core.personas.pago_aprobar_cambio",
  // Solo personas: la cuenta de pago de una persona la aprueba o rechaza un humano; la key de otro admin no (ADR-032, CAR-225 C-01).
  soloPersonas: true,
  descripcion:
    "Aprueba la solicitud pendiente de cambio de cuenta bancaria de una persona. Quien la solicitó no puede aprobarla; la cuenta anterior queda reemplazada y queda auditado.",
  permiso: PERMISOS_CORE.personasPagoAprobar,
  input: z.object({ id: uuidSchema }),
  output: z.object({
    personaId: z.string(),
    solicitudId: z.string(),
    estado: z.literal("aprobada"),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = await personaFicha(ctx, input.id);
    const s = await ctx.db.personaPagoSolicitud.findFirst({
      where: { personaId: p.id, estado: "pendiente" },
    });
    if (!s) throw conflicto("No hay una solicitud pendiente para esta persona.");
    if (!ctx.usuario?.id) throw reglaDeNegocio("Se requiere un usuario autenticado.");
    if (s.solicitadoPorId === ctx.usuario.id)
      throw prohibido("No puedes aprobar una solicitud que tú mismo registraste.");
    if (s.tipo === "reemplazar" || s.tipo === "agregar") exigirCatalogo(s); // CAR-244: a la cuenta vigente solo entra un banco del catálogo SBIF.
    if (dryRun) return { personaId: p.id, solicitudId: s.id, estado: "aprobada" as const };
    await escribirConEvento(
      ctx,
      { tipo: "core.persona.pago_aprobado", entidadTipo: "persona" },
      async (tx) => {
        const resuelta = await tx.personaPagoSolicitud.updateMany({
          where: {
            id: s.id,
            estado: "pendiente",
            solicitadoPorId: { not: ctx.usuario!.id },
          },
          data: {
            estado: "aprobada",
            resueltoPorId: ctx.usuario!.id,
            resueltaEn: new Date(),
          },
        });
        if (resuelta.count !== 1) {
          throw conflicto("La solicitud ya no está pendiente o no puedes resolverla.");
        }
        await aplicarSolicitudPago(ctx, tx, p, s);
        return { id: p.id };
      },
    );
    await vistaPago(ctx, p.id);
    return { personaId: p.id, solicitudId: s.id, estado: "aprobada" as const };
  },
});

export const personasPagoRechazarCambio = defineCapability({
  id: "core.personas.pago_rechazar_cambio",
  // Solo personas: la cuenta de pago de una persona la aprueba o rechaza un humano; la key de otro admin no (ADR-032, CAR-225 C-01).
  soloPersonas: true,
  descripcion:
    "Rechaza la solicitud pendiente de cambio de cuenta bancaria con un motivo obligatorio. La cuenta vigente no cambia.",
  permiso: PERMISOS_CORE.personasPagoAprobar,
  sensibles: ["motivo"],
  input: z.object({ id: uuidSchema, motivo: motivoRechazo }),
  output: z.object({
    personaId: z.string(),
    solicitudId: z.string(),
    estado: z.literal("rechazada"),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = await personaFicha(ctx, input.id);
    const s = await ctx.db.personaPagoSolicitud.findFirst({
      where: { personaId: p.id, estado: "pendiente" },
    });
    if (!s) throw conflicto("No hay una solicitud pendiente para esta persona.");
    if (!ctx.usuario?.id) throw reglaDeNegocio("Se requiere un usuario autenticado.");
    if (s.solicitadoPorId === ctx.usuario.id)
      throw prohibido("No puedes rechazar una solicitud que tú mismo registraste.");
    if (dryRun) return { personaId: p.id, solicitudId: s.id, estado: "rechazada" as const };
    await escribirConEvento(
      ctx,
      { tipo: "core.persona.pago_rechazado", entidadTipo: "persona" },
      async (tx) => {
        const resuelta = await tx.personaPagoSolicitud.updateMany({
          where: {
            id: s.id,
            estado: "pendiente",
            solicitadoPorId: { not: ctx.usuario!.id },
          },
          data: {
            estado: "rechazada",
            motivoRechazo: input.motivo,
            resueltoPorId: ctx.usuario!.id,
            resueltaEn: new Date(),
          },
        });
        if (resuelta.count !== 1) {
          throw conflicto("La solicitud ya no está pendiente o no puedes resolverla.");
        }
        return { id: p.id };
      },
    );
    return { personaId: p.id, solicitudId: s.id, estado: "rechazada" as const };
  },
});

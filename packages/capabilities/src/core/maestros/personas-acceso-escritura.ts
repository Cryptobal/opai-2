import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido, reglaDeNegocio } from "../../errores";
import { tenantActual, usuarioResponsable } from "../comun";
import { uuidSchema } from "../esquemas";
import { crearInvitacion } from "../invitar";
import type { Contexto } from "../../types";
import { personaDe } from "./personas-vista";
import { asegurarAccesoPortalTrabajador, type ResultadoAccesoPortalTrabajador } from "./personas-acceso-portal";
import { correoPortalPersona } from "./personas-acceso-logica";

const resultadoSchema = z.object({
  estado: z.enum([
    "ya_tiene_acceso",
    "vinculado",
    "invitado",
    "invitacion_pendiente",
    "sin_correo",
    "no_aplica",
  ]),
  motivo: z.string().optional(),
});

function exigeUsuarios(ctx: Contexto) {
  if (!ctx.autorizar(PERMISOS_CORE.usersManage)) {
    throw prohibido("Gestiona usuarios e invitaciones para dar acceso al portal del trabajador.");
  }
}

export const personasDarAccesoPortal = defineCapability({
  id: "core.personas.dar_acceso_portal",
  descripcion:
    "Da acceso al portal del trabajador: vincula si ya tiene usuario viewer o envía la invitación. Requiere gestionar personas y usuarios. Irreversible para un agente.",
  permiso: PERMISOS_CORE.personasManage,
  input: z
    .object({ personaId: uuidSchema.optional(), personaIds: z.array(uuidSchema).max(50).optional() })
    .refine((i) => Boolean(i.personaId) !== Boolean(i.personaIds?.length), {
      message: "Indica una persona o una lista, no ambas.",
    }),
  output: z.union([
    resultadoSchema,
    z.object({ resultados: z.array(resultadoSchema.extend({ personaId: z.string() })) }),
  ]),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeUsuarios(ctx);
    const ids = input.personaIds ?? (input.personaId ? [input.personaId] : []);
    if (!ids.length) throw reglaDeNegocio("Indica al menos una persona.");
    const resultados: (ResultadoAccesoPortalTrabajador & { personaId: string })[] = [];
    for (const personaId of ids) {
      resultados.push({ personaId, ...(await asegurarAccesoPortalTrabajador(ctx, personaId, dryRun)) });
    }
    if (ids.length === 1) {
      const uno = resultados[0]!;
      return { estado: uno.estado, motivo: uno.motivo };
    }
    return { resultados };
  },
});

export const personasReenviarInvitacionPortal = defineCapability({
  id: "core.personas.reenviar_invitacion",
  descripcion:
    "Reenvía la invitación al portal del trabajador si sigue pendiente: revoca la anterior y crea otra, o no hace nada si aún es vigente.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ personaId: uuidSchema, forzar: z.boolean().default(false) }),
  output: z.object({ reenviada: z.boolean(), estado: z.enum(["invitado", "invitacion_pendiente", "no_aplica"]) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeUsuarios(ctx);
    if (!ctx.modulosActivos.includes("portal_trabajador")) {
      return { reenviada: false, estado: "no_aplica" as const };
    }
    const p = await personaDe(ctx, input.personaId);
    const email = correoPortalPersona(p);
    if (!email) throw reglaDeNegocio("La persona no tiene un correo válido.");
    const pendiente = await ctx.db.invitation.findFirst({
      where: { email, acceptedAt: null, revocadaEn: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (pendiente && !input.forzar) {
      return { reenviada: false, estado: "invitacion_pendiente" as const };
    }
    if (dryRun) return { reenviada: Boolean(pendiente), estado: "invitado" as const };
    if (pendiente) {
      await ctx.db.invitation.update({ where: { id: pendiente.id }, data: { revocadaEn: new Date() } });
    }
    const tenant = await tenantActual(ctx);
    const invitadoPor = { id: usuarioResponsable(ctx), nombre: ctx.usuario?.nombre ?? "OPAI" };
    await crearInvitacion(
      ctx.db,
      tenant,
      {
        email,
        rol: "viewer",
        portales: ["trabajador", ...(ctx.modulosActivos.includes("terreno") ? ["terreno"] : [])],
        portalInicio: "trabajador",
        invitadoPor,
      },
      ctx.servicios,
      false,
    );
    return { reenviada: true, estado: "invitado" as const };
  },
});
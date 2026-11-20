import { z } from "zod";

import {
  ESTADOS_PERSONA,
  PERMISOS_CORE,
  PERSONA_ESTADO_BLOQUEADO_PERMANENTE,
  type EstadoPersona,
} from "@opai/domain";

import { defineCapability } from "../../define";
import type { Capacidad } from "../../types";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { aplicarEstadoPersona, type DefTransicionPersona } from "./personas-estado-aplicar";
import { personaDe, personaSchema } from "./personas-vista";

const motivo = z.string().trim().min(5).max(500).describe("Motivo (queda en la auditoría).");

const NORMALES: readonly DefTransicionPersona[] = [
  { id: "core.personas.a_evaluacion", hacia: "en_evaluacion", desde: "postulante", descripcion: "Pasa un postulante al estado «En evaluación» en reclutamiento." },
  {
    id: "core.personas.rechazar",
    hacia: "rechazado",
    desde: ["postulante", "en_evaluacion"],
    descripcion: "Marca a la persona como «Rechazada» (desde postulante o en evaluación).",
  },
  { id: "core.personas.marcar_externo", hacia: "externo", descripcion: "Pasa la persona a «Externa» (turnos extra sin contrato vigente)." },
  { id: "core.personas.activar", hacia: "activo", descripcion: "Pasa la persona a «Activa» (puede tener vínculo laboral)." },
  { id: "core.personas.inactivar", hacia: "inactivo", desde: "activo", descripcion: "Pasa una persona activa a «Inactiva» (sin vínculo vigente)." },
  { id: "core.personas.contratar_externo", hacia: "activo", desde: "externo", descripcion: "Contrata a una persona externa (pasa a «Activa»)." },
  {
    id: "core.personas.reactivar",
    hacia: "activo",
    desde: "inactivo",
    descripcion: "Reactiva a una persona inactiva no archivada (pasa a «Activa»).",
  },
  { id: "core.personas.externar", hacia: "externo", desde: "inactivo", descripcion: "Pasa una persona inactiva al estado «Externa» (turno extra)." },
];

function estadosOrigen(def: DefTransicionPersona): readonly EstadoPersona[] | null {
  if (def.desde === undefined) return null;
  const d = def.desde;
  return typeof d === "string" ? [d] : [...d];
}

function capTransicion(def: DefTransicionPersona) {
  const origenes = estadosOrigen(def);
  return defineCapability({
    id: def.id,
    descripcion: def.descripcion,
    permiso: PERMISOS_CORE.personasManage,
    sensibles: ["motivo"],
    input: z.object({ id: uuidSchema, motivo }),
    output: personaSchema,
    efecto: "escritura",
    dryRun: true,
    handler: (ctx, input, { dryRun }) => {
      if (origenes) {
        return personaDe(ctx, input.id).then((p) => {
          const actual = (p.estado ?? "activo") as EstadoPersona;
          if (!origenes.includes(actual)) {
            throw reglaDeNegocio(`Esta acción solo aplica desde «${origenes.join("» o «")}».`);
          }
          if (def.id === "core.personas.reactivar" && p.archivadaEn) {
            throw reglaDeNegocio("La persona está archivada: no puede reactivarse.");
          }
          return aplicarEstadoPersona(ctx, input.id, def.hacia, dryRun, "core.persona.estado_cambiado");
        });
      }
      return aplicarEstadoPersona(ctx, input.id, def.hacia, dryRun, "core.persona.estado_cambiado");
    },
  });
}

export const personasEstadoBloquearPermanente = defineCapability({
  id: "core.personas.bloquear_permanente",
  descripcion: "Bloquea de forma permanente a la persona (no recontratable): desde cualquier estado salvo que ya esté bloqueada.",
  soloPersonas: true,
  permiso: PERMISOS_CORE.personasEstadoAdmin,
  sensibles: ["motivo"],
  input: z.object({ id: uuidSchema, motivo }),
  output: personaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await personaDe(ctx, input.id);
    if (actual.estado === PERSONA_ESTADO_BLOQUEADO_PERMANENTE) {
      throw reglaDeNegocio("La persona ya está bloqueada de forma permanente.");
    }
    return aplicarEstadoPersona(ctx, input.id, PERSONA_ESTADO_BLOQUEADO_PERMANENTE, dryRun, "core.persona.bloqueada_permanente");
  },
});

export const personasEstadoDesbloquearPermanente = defineCapability({
  id: "core.personas.desbloquear_permanente",
  descripcion: "Quita el bloqueo permanente y deja a la persona en «Inactiva». Solo administradores (permiso estado.admin).",
  soloPersonas: true,
  permiso: PERMISOS_CORE.personasEstadoAdmin,
  sensibles: ["motivo"],
  input: z.object({ id: uuidSchema, motivo }),
  output: personaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await personaDe(ctx, input.id);
    if (actual.estado !== PERSONA_ESTADO_BLOQUEADO_PERMANENTE) {
      throw reglaDeNegocio("La persona no está bloqueada de forma permanente.");
    }
    return aplicarEstadoPersona(ctx, input.id, "inactivo", dryRun, "core.persona.desbloqueada_permanente", undefined, true);
  },
});

export const capacidadesPersonasEstado: readonly Capacidad[] = [
  ...NORMALES.map(capTransicion),
  personasEstadoBloquearPermanente,
  personasEstadoDesbloquearPermanente,
];

export const estadosPersonaSchema = z.enum(ESTADOS_PERSONA);
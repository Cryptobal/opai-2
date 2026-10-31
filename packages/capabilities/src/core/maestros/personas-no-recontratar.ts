import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { diaSchema, hoy } from "./comun";
import { cambiar, marcaNoRecontratarSchema, personaParaMarca, vista } from "./personas-no-recontratar-core";
import { exigirNoRecontratarHabilitada } from "./personas-no-recontratar-vigencia";

export { marcaNoRecontratarSchema };

const motivo = z
  .string()
  .trim()
  .min(5)
  .max(500)
  .describe("Hecho que la justifica, con respaldo (queda en la auditoría como dato reservado).");

const venceEn = diaSchema.refine(
  (d) => d > hoy(),
  "La fecha de vencimiento debe ser posterior a hoy.",
);

/**
 * Ve la marca P1 "No recontratar" de una persona, con su motivo y fecha. Solo RRHH y
 * administradores: el permiso requerido gatilla un 403 para el resto antes de llegar al handler,
 * así que quien no tiene el permiso no ve ni que la sección existe.
 */
export const personasNoRecontratarVer = defineCapability({
  // Dato reservado (art. 154 ter del Código del Trabajo; Ley 19.628 art. 13 d), modificada por la
  // 21.719): se audita el id revelado, nunca el motivo (NÚCLEO-H, REGLAS-codigo.md «Lecturas auditadas»).
  auditarLectura: (s: { personaId: string }) => [s.personaId],
  id: "core.personas.no_recontratar_ver",
  descripcion:
    "Muestra si una persona quedó marcada «No recontratar» (marca P1), con el motivo y las fechas. Solo visible para RRHH y administradores.",
  permiso: PERMISOS_CORE.personasNoRecontratarManage,
  input: z.object({ id: uuidSchema }),
  output: marcaNoRecontratarSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    return vista(await personaParaMarca(ctx, input.id));
  },
});

export const personasMarcarNoRecontratar = defineCapability({
  id: "core.personas.marcar_no_recontratar",
  descripcion:
    "Marca a una persona como «No recontratar» (marca P1) con un motivo y una fecha de vencimiento obligatorios. Solo RRHH y administradores; queda en la auditoría con base de interés legítimo (Ley 19.628, modificada por la 21.719).",
  permiso: PERMISOS_CORE.personasNoRecontratarManage,
  sensibles: ["motivo"],
  input: z.object({ id: uuidSchema, motivo, venceEn }),
  output: marcaNoRecontratarSchema,
  efecto: "escritura",
  dryRun: true,
  handler(ctx, input, { dryRun }) {
    exigirNoRecontratarHabilitada();
    return cambiar(
      ctx,
      input.id,
      dryRun,
      "core.persona.no_recontratar_marcada",
      true,
      input.motivo,
      input.venceEn,
    );
  },
});

export const personasQuitarNoRecontratar = defineCapability({
  id: "core.personas.quitar_no_recontratar",
  descripcion:
    "Quita la marca «No recontratar» (marca P1) de una persona, con el motivo de levantarla. Solo RRHH y administradores; el motivo anterior se elimina.",
  permiso: PERMISOS_CORE.personasNoRecontratarManage,
  sensibles: ["motivo"],
  input: z.object({ id: uuidSchema, motivo }),
  output: marcaNoRecontratarSchema,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) =>
    cambiar(ctx, input.id, dryRun, "core.persona.no_recontratar_quitada", false, input.motivo, null),
});

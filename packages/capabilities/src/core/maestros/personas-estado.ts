import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "./comun";
import { personaDe, personaSchema, vinculosVigentes, vistaPersona } from "./personas-vista";
import { exigirNoAnonimizado } from "./anonimizado";

const motivo = z.string().trim().min(5).max(500).describe("Motivo (queda en la auditoría).");

/** Escritura de estado de persona con su evento; devuelve la vista con el vínculo vigente. */
async function cambiar(
  ctx: Contexto,
  id: string,
  dryRun: boolean,
  tipo: string,
  data: Record<string, unknown>,
) {
  const actual = await personaDe(ctx, id);
  exigirNoAnonimizado(actual, "La persona");
  const vinculo = (await vinculosVigentes(ctx, [id])).get(id) ?? null;
  if (dryRun) return vistaPersona({ ...actual, ...data }, vinculo);
  const p = await escribirConEvento(
    ctx,
    { tipo, entidadTipo: "persona", payload: () => data },
    (tx) => tx.persona.update({ where: { id }, data }),
  );
  return vistaPersona(p, vinculo);
}

export const personasBloquear = defineCapability({
  id: "core.personas.bloquear",
  descripcion:
    "Bloquea a una persona (no puede ser asignada ni marcar asistencia) con un motivo obligatorio, por ejemplo documentación vencida.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ id: uuidSchema, motivo }),
  output: personaSchema,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) =>
    cambiar(ctx, input.id, dryRun, "core.persona.bloqueada", {
      bloqueada: true,
      bloqueoMotivo: input.motivo,
      bloqueadaEn: new Date(),
    }),
});

export const personasDesbloquear = defineCapability({
  id: "core.personas.desbloquear",
  descripcion: "Quita el bloqueo de una persona, con el motivo del desbloqueo.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ id: uuidSchema, motivo }),
  output: personaSchema,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) =>
    cambiar(ctx, input.id, dryRun, "core.persona.desbloqueada", {
      bloqueada: false,
      bloqueoMotivo: null,
      bloqueadaEn: null,
    }),
});

export const personasArchive = defineCapability({
  id: "core.personas.archive",
  descripcion:
    "Archiva a una persona (sale de las listas; su historial y documentos se conservan). Exige que no tenga vínculo laboral vigente.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ id: uuidSchema }),
  output: personaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if ((await vinculosVigentes(ctx, [input.id])).has(input.id)) {
      throw reglaDeNegocio("La persona tiene un vínculo vigente: termínalo antes de archivarla.");
    }
    return cambiar(ctx, input.id, dryRun, "core.persona.archivada", {
      archivadaEn: new Date(),
      estado: "inactiva",
    });
  },
});

export const personasVincularUsuario = defineCapability({
  id: "core.personas.vincular_usuario",
  descripcion:
    "Vincula (1 a 1) a una persona con un usuario de OPAI de la empresa, para que entre a su portal; null desvincula.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({ id: uuidSchema, usuarioId: uuidSchema.nullable() }),
  output: personaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.usuarioId) {
      const m = await ctx.db.membership.findFirst({
        where: { userId: input.usuarioId, estado: "activa" },
      });
      if (!m) throw reglaDeNegocio("El usuario no tiene una membresía activa en la empresa.");
      const otra = await ctx.db.persona.findFirst({
        where: { usuarioId: input.usuarioId, id: { not: input.id } },
      });
      if (otra)
        throw conflicto(`El usuario ya está vinculado a ${otra.nombres} ${otra.apellidos}.`);
    }
    return cambiar(ctx, input.id, dryRun, "core.persona.actualizada", {
      usuarioId: input.usuarioId,
    });
  },
});

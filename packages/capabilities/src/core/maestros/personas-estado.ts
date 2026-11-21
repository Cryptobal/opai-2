import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "./comun";
import { personaDe, personaSchema, vinculosVigentes, vistaPersona } from "./personas-vista";
import { bloquearNoAnonimizado, exigirNoAnonimizado } from "./anonimizado";
import { archivarPersonaEnTx, exigirArchivoPersona } from "./personas-estado-implicito";
import { esInternoParaPortalTrabajador, vincularPersonaUsuario } from "./personas-acceso-logica";

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
    async (tx) => {
      await bloquearNoAnonimizado(tx, "persona", id);
      return tx.persona.update({ where: { id }, data });
    },
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
    const actual = await personaDe(ctx, input.id);
    exigirNoAnonimizado(actual, "La persona");
    const desde = actual.estado ?? "activo";
    exigirArchivoPersona(desde);
    const archivadaEn = new Date();
    const vinculo = (await vinculosVigentes(ctx, [input.id])).get(input.id) ?? null;
    if (dryRun) {
      return vistaPersona({ ...actual, archivadaEn, estado: "inactivo" }, vinculo);
    }
    const p = await escribirConEvento(
      ctx,
      { tipo: "core.persona.archivada", entidadTipo: "persona", payload: () => ({ archivadaEn }) },
      async (tx) => {
        await bloquearNoAnonimizado(tx, "persona", input.id);
        await archivarPersonaEnTx(tx, input.id, desde, archivadaEn);
        const fila = await tx.persona.findFirst({ where: { id: input.id } });
        if (!fila) throw reglaDeNegocio("No se encontró la persona.");
        return fila;
      },
    );
    return vistaPersona(p, vinculo);
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
    if (input.usuarioId === null) {
      return cambiar(ctx, input.id, dryRun, "core.persona.actualizada", { usuarioId: null });
    }
    await vincularPersonaUsuario(ctx, input.id, input.usuarioId, dryRun);
    return cambiar(ctx, input.id, dryRun, "core.persona.actualizada", {
      usuarioId: input.usuarioId,
    });
  },
});

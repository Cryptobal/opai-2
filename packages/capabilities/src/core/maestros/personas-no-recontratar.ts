import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { iso } from "../comun";
import { bloquearNoAnonimizado, exigirNoAnonimizado } from "./anonimizado";
import { dondePersona } from "./alcance";
import { escribirConEvento } from "./comun";

const motivo = z
  .string()
  .trim()
  .min(5)
  .max(500)
  .describe("Motivo (lista cerrada + nota, queda en la auditoría con base de interés legítimo).");

export const marcaNoRecontratarSchema = z.object({
  personaId: z.string(),
  activa: z.boolean(),
  motivo: z.string().nullable(),
  marcadaEn: z.string().nullable(),
});

type FilaMarca = {
  id: string;
  noRecontratar?: boolean | null;
  noRecontratarMotivo?: string | null;
  noRecontratarEn?: Date | null;
};

function vista(p: FilaMarca) {
  return {
    personaId: p.id,
    activa: p.noRecontratar ?? false,
    motivo: p.noRecontratarMotivo ?? null,
    marcadaEn: iso(p.noRecontratarEn ?? null),
  };
}

/** Solo trae las columnas de la marca: la vista general de personas (personaDe) no las expone. */
async function personaParaMarca(ctx: Contexto, id: string) {
  const p = await ctx.db.persona.findFirst({
    where: { id, AND: [dondePersona(ctx)] },
    select: {
      id: true,
      anonimizadaEn: true,
      noRecontratar: true,
      noRecontratarMotivo: true,
      noRecontratarEn: true,
    },
  });
  if (!p) throw noEncontrado("La persona");
  return p;
}

const SELECT_MARCA = {
  id: true,
  noRecontratar: true,
  noRecontratarMotivo: true,
  noRecontratarEn: true,
} as const;

async function cambiar(
  ctx: Contexto,
  id: string,
  dryRun: boolean,
  tipo: string,
  activa: boolean,
  motivoTexto: string,
) {
  const actual = await personaParaMarca(ctx, id);
  exigirNoAnonimizado(actual, "La persona");
  const data = {
    noRecontratar: activa,
    noRecontratarMotivo: activa ? motivoTexto : null,
    noRecontratarEn: activa ? new Date() : null,
  };
  if (dryRun) return vista({ ...actual, ...data });
  const p = await escribirConEvento(
    ctx,
    { tipo, entidadTipo: "persona", payload: () => ({ motivo: motivoTexto }) },
    async (tx) => {
      await bloquearNoAnonimizado(tx, "persona", id);
      return tx.persona.update({ where: { id }, data, select: SELECT_MARCA });
    },
  );
  return vista(p);
}

/**
 * Ve la marca P1 "No recontratar" de una persona, con su motivo y fecha. Solo RRHH y
 * administradores: el permiso requerido gatilla un 403 para el resto antes de llegar al handler,
 * así que quien no tiene el permiso no ve ni que la sección existe.
 */
export const personasNoRecontratarVer = defineCapability({
  // Dato personal sensible (Ley 21.719, P1 con base de interés legítimo): se audita el id revelado,
  // nunca el motivo (NÚCLEO-H, REGLAS-codigo.md «Lecturas auditadas»).
  auditarLectura: (s: { personaId: string }) => [s.personaId],
  id: "core.personas.no_recontratar_ver",
  descripcion:
    "Muestra si una persona quedó marcada «No recontratar» (lista negra P1), con el motivo y la fecha. Solo visible para RRHH y administradores.",
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
    "Marca a una persona como «No recontratar» (lista negra P1) con un motivo obligatorio. Solo RRHH y administradores; queda en la auditoría con base de interés legítimo (Ley 21.719).",
  permiso: PERMISOS_CORE.personasNoRecontratarManage,
  input: z.object({ id: uuidSchema, motivo }),
  output: marcaNoRecontratarSchema,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) =>
    cambiar(ctx, input.id, dryRun, "core.persona.no_recontratar_marcada", true, input.motivo),
});

export const personasQuitarNoRecontratar = defineCapability({
  id: "core.personas.quitar_no_recontratar",
  descripcion:
    "Quita la marca «No recontratar» (lista negra P1) de una persona, con el motivo de levantarla. Solo RRHH y administradores.",
  permiso: PERMISOS_CORE.personasNoRecontratarManage,
  input: z.object({ id: uuidSchema, motivo }),
  output: marcaNoRecontratarSchema,
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) =>
    cambiar(ctx, input.id, dryRun, "core.persona.no_recontratar_quitada", false, input.motivo),
});

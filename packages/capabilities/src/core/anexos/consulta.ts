import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { dondePersona } from "../maestros/alcance";
import { cursorDe, pagina } from "../maestros/comun";
import { anexoDe } from "./comun";
import { filasParaDocumento } from "./documento";
import { anexoSchema, ESTADOS_ANEXO, vistaAnexo } from "./vista";

const filaDocSchema = z.object({ concepto: z.string(), antes: z.string(), despues: z.string() });

export const anexosList = defineCapability({
  auditarLectura: (s) => s.items.map((a) => a.id),
  id: "core.anexos.list",
  descripcion:
    "Lista los anexos de contrato de una persona o los pendientes de todo el tenant (sin personaId), del más reciente al más antiguo, con su estado y motivo del cambio.",
  permiso: PERMISOS_CORE.anexosRead,
  input: z.object({
    personaId: z.uuid().optional(),
    estado: z.enum(ESTADOS_ANEXO).optional(),
    cursor: z.uuid().optional(),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({ items: z.array(anexoSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.anexoContrato.findMany({
      where: {
        ...(input.personaId ? { personaId: input.personaId } : {}),
        ...(input.estado ? { estado: input.estado } : {}),
        persona: dondePersona(ctx),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    return pagina(filas.map(vistaAnexo), input.limite);
  },
});

export const anexosGet = defineCapability({
  auditarLectura: (s) => [s.id],
  id: "core.anexos.get",
  descripcion:
    "Un anexo de contrato con su antes y después, para revisarlo antes de aprobarlo o rechazarlo.",
  permiso: PERMISOS_CORE.anexosRead,
  input: z.object({ id: z.uuid() }),
  output: anexoSchema.extend({ filas: z.array(filaDocSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const a = await anexoDe(ctx, input.id);
    return { ...vistaAnexo(a), filas: await filasParaDocumento(ctx, a) };
  },
});

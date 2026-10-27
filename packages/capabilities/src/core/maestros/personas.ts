import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { dondePersona } from "./alcance";
import { cursorDe, listaSchema, pagina } from "./comun";
import { personaDe, personaSchema, vinculosVigentes, vistaPersona } from "./personas-vista";
import { alertasDocumentos, alertasSchema } from "./resumenes";

export const personasList = defineCapability({
  id: "core.personas.list",
  descripcion:
    "Lista las personas (trabajadores) con búsqueda por nombre o RUT y filtros por cargo y estado (activa, inactiva, bloqueada). Incluye el vínculo laboral vigente. Paginada por cursor.",
  permiso: PERMISOS_CORE.personasRead,
  input: listaSchema.extend({
    cargoId: uuidSchema.optional(),
    estado: z.enum(["activa", "inactiva", "bloqueada"]).optional(),
  }),
  output: z.object({
    items: z.array(personaSchema.extend({ documentos: alertasSchema })),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const q = input.q;
    const porCargo = input.cargoId
      ? (
          await ctx.db.vinculoLaboral.findMany({
            where: { cargoId: input.cargoId, estado: "vigente" },
            select: { personaId: true },
          })
        ).map((v) => v.personaId)
      : null;
    const rut = (q ?? "").replace(/[.\s]/g, "").toUpperCase();
    const filas = await ctx.db.persona.findMany({
      where: {
        AND: [dondePersona(ctx)],
        ...(input.incluirArchivadas ? {} : { archivadaEn: null }),
        ...(porCargo ? { id: { in: porCargo } } : {}),
        ...(input.estado === "bloqueada"
          ? { bloqueada: true }
          : input.estado
            ? { estado: input.estado }
            : {}),
        ...(q
          ? {
              OR: [
                { nombres: { contains: q, mode: "insensitive" as const } },
                { apellidos: { contains: q, mode: "insensitive" as const } },
                { rut: { startsWith: rut } },
              ],
            }
          : {}),
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const p = pagina(filas, input.limite);
    const vinculos = await vinculosVigentes(
      ctx,
      p.items.map((x) => x.id),
    );
    const alertas = await alertasDocumentos(
      ctx,
      "persona",
      p.items.map((x) => x.id),
    );
    return {
      items: p.items.map((x) => ({
        ...vistaPersona(x, vinculos.get(x.id) ?? null),
        documentos: alertas(x.id),
      })),
      siguiente: p.siguiente,
    };
  },
});

export const personasGet = defineCapability({
  id: "core.personas.get",
  descripcion:
    "Ficha completa de una persona: identificación, contacto, dirección, estado, bloqueo y vínculo laboral vigente. Los sueldos van por core.estructuras.*.",
  permiso: PERMISOS_CORE.personasRead,
  portales: ["erp", "supervisor"],
  input: z.object({ id: uuidSchema }),
  output: personaSchema.extend({ documentos: z.number() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const p = await personaDe(ctx, input.id);
    const [vinculos, documentos] = await Promise.all([
      vinculosVigentes(ctx, [p.id]),
      ctx.db.documentoVinculo.count({ where: { entidadTipo: "persona", entidadId: p.id } }),
    ]);
    return { ...vistaPersona(p, vinculos.get(p.id) ?? null), documentos };
  },
});

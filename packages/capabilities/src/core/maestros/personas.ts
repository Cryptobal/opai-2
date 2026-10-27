import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { noEncontrado } from "../../errores";
import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { dondePersona } from "./alcance";
import { cursorDe, listaSchema, pagina } from "./comun";
import { personaSchema, vinculoVista, vistaPersona } from "./personas-vista";
import { alertasDocumentos, alertasSchema } from "./resumenes";

export const personasList = defineCapability({
  auditarLectura: (s) => s.items.map((p) => p.id),
  id: "core.personas.list",
  descripcion:
    "Lista las personas (trabajadores) con búsqueda por nombre o RUT y filtros por cargo y estado (activa, inactiva, bloqueada). Incluye el vínculo laboral vigente, el total de la consulta y, con incluirFiltros, los cargos para el filtro. Paginada por cursor.",
  permiso: PERMISOS_CORE.personasRead,
  input: listaSchema.extend({
    cargoId: uuidSchema.optional(),
    estado: z.enum(["activa", "inactiva", "bloqueada"]).optional(),
    incluirFiltros: z
      .boolean()
      .default(false)
      .describe("Devuelve también los cargos (id y nombre) para el filtro de la pantalla."),
  }),
  output: z.object({
    items: z.array(personaSchema.extend({ documentos: alertasSchema })),
    siguiente: z.string().nullable(),
    total: z.number().describe("Total de personas que cumplen la consulta (sin paginar)."),
    cargos: z
      .array(z.object({ id: z.string(), nombre: z.string() }))
      .optional()
      .describe("Cargos activos para el filtro (solo con incluirFiltros)."),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const q = input.q;
    const rut = (q ?? "").replace(/[.\s]/g, "").toUpperCase();
    // El filtro por cargo se resuelve con una relación (`some`), no con una consulta de ids aparte.
    const where = {
      AND: [dondePersona(ctx)],
      ...(input.incluirArchivadas ? {} : { archivadaEn: null }),
      ...(input.cargoId
        ? { vinculos: { some: { cargoId: input.cargoId, estado: "vigente" } } }
        : {}),
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
    };
    // Página con vínculo/cargo por include y catálogo opcional del filtro (ADR-045).
    const [filas, cargos] = await Promise.all([
      ctx.db.persona.findMany({
        where,
        orderBy: [{ apellidos: "asc" }, { nombres: "asc" }, { id: "asc" }],
        take: input.limite + 1,
        ...cursorDe(input.cursor),
        include: {
          vinculos: {
            where: { estado: "vigente" },
            include: { cargo: { select: { nombre: true } } },
            take: 1,
          },
        },
      }),
      input.incluirFiltros && ctx.autorizar(PERMISOS_CORE.estructurasRead)
        ? ctx.db.cargo.findMany({
            where: { activo: true },
            orderBy: [{ orden: "asc" }, { nombre: "asc" }],
            select: { id: true, nombre: true },
          })
        : Promise.resolve(null),
    ]);
    // Sin cursor ni fila extra, la página contiene TODO el resultado: contar otra vez es redundante.
    // Con más páginas (o cursor) se mantiene el total exacto, con idéntico filtro y alcance.
    const total =
      !input.cursor && filas.length <= input.limite
        ? filas.length
        : await ctx.db.persona.count({ where });
    const p = pagina(filas, input.limite);
    const alertas = await alertasDocumentos(
      ctx,
      "persona",
      p.items.map((x) => x.id),
    );
    return {
      items: p.items.map((x) => ({
        ...vistaPersona(x, x.vinculos[0] ? vinculoVista(x.vinculos[0]) : null),
        documentos: alertas(x.id),
      })),
      siguiente: p.siguiente,
      total,
      ...(cargos ? { cargos } : {}),
    };
  },
});

export const personasGet = defineCapability({
  auditarLectura: (s) => [s.id],
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
    const p = await ctx.db.persona.findFirst({
      where: { id: input.id, AND: [dondePersona(ctx)] },
      include: {
        vinculos: {
          where: { estado: "vigente" },
          include: { cargo: { select: { nombre: true } } },
          take: 1,
        },
      },
    });
    if (!p) throw noEncontrado("La persona");
    const documentos = await ctx.db.documentoVinculo.count({
      where: { entidadTipo: "persona", entidadId: p.id },
    });
    return { ...vistaPersona(p, p.vinculos[0] ? vinculoVista(p.vinculos[0]) : null), documentos };
  },
});

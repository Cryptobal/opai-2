import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
import type { Prisma } from "@opai/db";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { aFecha, hoy } from "../maestros/comun";
import { uuidSchema } from "../esquemas";
import { documentosEnAlcance } from "./alcance-doc";
import { tiposPorId } from "./consulta";
import type { ENTIDADES } from "./vista";
import { documentoSchema, vistaDocumento } from "./vista";
import { propietariosDe } from "./explorar-entidades";
import { desdeAncla } from "./explorar-filtros";
import { filtroDocumentoSensible } from "./sensibles";

const filaSchema = documentoSchema.extend({
  entidad: z
    .object({ tipo: z.string(), id: z.string(), nombre: z.string().nullable() })
    .nullable()
    .describe(
      "Propietario del documento; el nombre solo si el actor puede leer ese tipo de entidad.",
    ),
});

const CAPA_ENTIDAD: Record<
  "empresa" | "cuenta" | "instalacion" | "persona" | "puesto",
  (typeof ENTIDADES)[number]
> = {
  empresa: "tenant",
  cuenta: "cuenta",
  instalacion: "instalacion",
  persona: "persona",
  puesto: "puesto",
};

export const documentosVencimientos = defineCapability({
  auditarLectura: (s) => [
    ...s.items.map((d) => d.id),
    ...s.items.flatMap((d) =>
      d.entidad?.tipo === "persona" && d.entidad.nombre ? [d.entidad.id] : [],
    ),
  ],
  id: "core.documentos.vencimientos",
  descripcion:
    "Documentos vencidos y por vencer en los próximos N días (por defecto 30), con la entidad a la que pertenecen, filtrables por capa (empresa, cuenta, instalación, persona, puesto). Paginada por cursor.",
  permiso: PERMISOS_CORE.documentosRead,
  input: z.object({
    dias: z.number().int().min(0).max(365).default(30),
    capa: z.enum(["empresa", "cuenta", "instalacion", "persona", "puesto"]).optional(),
    cursor: uuidSchema.optional().describe("`siguiente` de la página anterior."),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({
    items: z.array(filaSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const limite = new Date(aFecha(hoy()).getTime() + input.dias * 86_400_000);
    const permitidos = await documentosEnAlcance(ctx);
    const filtros: Prisma.DocumentoWhereInput[] = [
      filtroDocumentoSensible(ctx),
      { estado: "disponible" },
      { venceEn: { lte: limite } },
      ...(permitidos ? [{ id: { in: [...permitidos] } }] : []),
      ...(input.capa
        ? [
            {
              vinculos: {
                some: {
                  rol: "propietario",
                  entidadTipo: CAPA_ENTIDAD[input.capa],
                },
              },
            },
          ]
        : []),
    ];
    const where: Prisma.DocumentoWhereInput = { AND: filtros };
    const ancla = input.cursor
      ? await ctx.db.documento.findFirst({ where: { AND: [where, { id: input.cursor }] } })
      : null;
    if (input.cursor && !ancla) throw noEncontrado("La página pedida");
    const orden = [
      { venceEn: { sort: "asc" as const, nulls: "last" as const } },
      { createdAt: "desc" as const },
      { id: "asc" as const },
    ];
    const filas = await ctx.db.documento.findMany({
      where: ancla ? { AND: [where, desdeAncla("vence", ancla)] } : where,
      orderBy: orden,
      take: input.limite + 1,
    });
    const docs = filas.slice(0, input.limite);
    const siguiente = filas.length > input.limite ? (docs.at(-1)?.id ?? null) : null;
    const propietario = await propietariosDe(
      ctx,
      docs.map((d) => d.id),
    );
    const tipos = await tiposPorId(
      ctx,
      docs.map((d) => d.tipoId),
    );
    const items = docs.map((d) => ({
      ...vistaDocumento(d, d.tipoId ? tipos.get(d.tipoId) : null, hoy()),
      entidad: propietario.get(d.id) ?? null,
    }));
    return { items, siguiente };
  },
});
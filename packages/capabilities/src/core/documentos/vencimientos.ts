import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
import type { Prisma } from "@opai/db";

import { defineCapability } from "../../define";
import { aFecha, hoy } from "../maestros/comun";
import { filtroAlcanceDocumentos } from "./alcance-doc";
import { tiposPorId } from "./consulta";
import type { ENTIDADES } from "./vista";
import { documentoSchema, vistaDocumento } from "./vista";
import { auditarLecturaFilasConPersona, entidadPropietarioSchema } from "./explorar-fila";
import { propietariosDe } from "./explorar-entidades";
import { inputPaginaDocumentos } from "./paginacion";
import { paginaDocumentosVence } from "./pagina-vence";
import { filtroDocumentoSensible } from "./sensibles";

const filaSchema = documentoSchema.extend({ entidad: entidadPropietarioSchema });

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
  auditarLectura: auditarLecturaFilasConPersona,
  id: "core.documentos.vencimientos",
  descripcion:
    "Documentos vencidos y por vencer en los próximos N días (por defecto 30), con la entidad a la que pertenecen, filtrables por capa (empresa, cuenta, instalación, persona, puesto). Paginada por cursor.",
  permiso: PERMISOS_CORE.documentosRead,
  input: z.object({
    dias: z.number().int().min(0).max(365).default(30),
    capa: z.enum(["empresa", "cuenta", "instalacion", "persona", "puesto"]).optional(),
    ...inputPaginaDocumentos,
  }),
  output: z.object({
    items: z.array(filaSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const limite = new Date(aFecha(hoy()).getTime() + input.dias * 86_400_000);
    const permitidos = await filtroAlcanceDocumentos(ctx);
    const filtros: Prisma.DocumentoWhereInput[] = [
      filtroDocumentoSensible(ctx),
      { estado: "disponible" },
      { venceEn: { lte: limite } },
      permitidos,
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
    const { filas: docs, siguiente } = await paginaDocumentosVence(
      ctx,
      where,
      input.limite,
      input.cursor,
    );
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
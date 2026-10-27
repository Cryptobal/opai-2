import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { aFecha, hoy } from "../maestros/comun";
import { documentosEnAlcance } from "./alcance-doc";
import { tiposPorId } from "./consulta";
import { CAPA_DE } from "./entidad";
import { documentoSchema, ENTIDADES, vistaDocumento } from "./vista";
import { filtroDocumentoSensible } from "./sensibles";

export const documentosVencimientos = defineCapability({
  auditarLectura: (s) => s.map((d) => d.id),
  id: "core.documentos.vencimientos",
  descripcion:
    "Documentos vencidos y por vencer en los próximos N días (por defecto 30), con la entidad a la que pertenecen, filtrables por capa (empresa, cuenta, instalación, persona, puesto).",
  permiso: PERMISOS_CORE.documentosRead,
  input: z.object({
    dias: z.number().int().min(0).max(365).default(30),
    capa: z.enum(["empresa", "cuenta", "instalacion", "persona", "puesto"]).optional(),
  }),
  output: z.array(
    documentoSchema.extend({ entidad: z.object({ tipo: z.string(), id: z.string() }).nullable() }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const limite = new Date(aFecha(hoy()).getTime() + input.dias * 86_400_000);
    // Alcance por filas (ADR-022): un actor acotado solo ve los documentos de sus entidades a cargo.
    const permitidos = await documentosEnAlcance(ctx);
    const docs = await ctx.db.documento.findMany({
      where: {
        ...filtroDocumentoSensible(ctx),
        estado: "disponible",
        venceEn: { lte: limite },
        ...(permitidos ? { id: { in: [...permitidos] } } : {}),
      },
      orderBy: { venceEn: "asc" },
      take: 1000,
    });
    const vinculos = await ctx.db.documentoVinculo.findMany({
      where: { documentoId: { in: docs.map((d) => d.id) }, rol: "propietario" },
    });
    const propietario = new Map(
      vinculos.map((v) => [v.documentoId, { tipo: v.entidadTipo, id: v.entidadId }]),
    );
    const tipos = await tiposPorId(
      ctx,
      docs.map((d) => d.tipoId),
    );
    const capaDe = (tipo?: string) =>
      tipo && (ENTIDADES as readonly string[]).includes(tipo)
        ? CAPA_DE[tipo as keyof typeof CAPA_DE]
        : null;
    return docs
      .map((d) => ({
        ...vistaDocumento(d, d.tipoId ? tipos.get(d.tipoId) : null, hoy()),
        entidad: propietario.get(d.id) ?? null,
      }))
      .filter((d) => !input.capa || capaDe(d.entidad?.tipo) === input.capa);
  },
});

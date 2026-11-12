import { z } from "zod";

import { construirExcelNegocios } from "@opai/domain/exportacion";

import { etiquetasDeFilas } from "../core/crm/etiquetas-filas";
import { defineCapability } from "../define";
import { dondeNegocios, enriquecer, filtros } from "./negocios-lectura";

export const PERMISO_EXPORTAR = "comercial:negocios.exportar";
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const LIMITE_MAXIMO = 5000;

const entrada = filtros.omit({ cursor: true, limite: true }).extend({
  limite: z
    .number()
    .int()
    .min(1)
    .max(LIMITE_MAXIMO)
    .default(LIMITE_MAXIMO)
    .describe("Máximo de negocios a exportar (por defecto y como tope, 5.000)."),
});

const dia = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

export const negociosExportar = defineCapability({
  id: "comercial.negocios.exportar",
  descripcion:
    "Exporta a un archivo Excel los negocios de la empresa que cumplen los mismos filtros de la lista (texto, etapa, responsable, origen, estado, etiqueta), hasta 5.000 filas. Avisa si quedó incompleto.",
  permiso: PERMISO_EXPORTAR,
  input: entrada,
  output: z.object({
    nombre: z.string(),
    mime: z.string(),
    base64: z.string(),
    total: z.number().int(),
    truncado: z.boolean(),
  }),
  efecto: "lectura",
  dryRun: false,
  // Agregado sin ids: la auditoría registra quién exportó y cuándo (tenant, actor y capacidad).
  auditarLectura: () => [],
  async handler(ctx, input) {
    const where = await dondeNegocios(ctx, input);
    const filas = await ctx.db.negocio.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limite + 1,
    });
    const truncado = filas.length > input.limite;
    const negocios = filas.slice(0, input.limite);
    const [extra, etiquetas, motivos] = await Promise.all([
      enriquecer(ctx, negocios),
      etiquetasDeFilas(
        ctx,
        "negocio",
        negocios.map((n) => n.id),
      ),
      ctx.db.motivoPerdida.findMany({ select: { id: true, nombre: true } }),
    ]);
    const bytes = await construirExcelNegocios(
      negocios.map((n) => {
        const e = extra(n);
        return {
          titulo: n.titulo,
          cuenta: e.cuentaNombre,
          etapa: e.etapaNombre,
          estado: n.estado,
          responsable: e.responsableNombre,
          probabilidad: n.probabilidad,
          montoEstimadoMensual: n.montoEstimadoMensual,
          valorMensual: n.valorMensual,
          cierreEstimado: dia(n.cierreEstimado),
          inicioServicioEstimado: dia(n.inicioServicioEstimado),
          cotizacionEnviadaEn: dia(n.cotizacionEnviadaEn),
          ganadoEn: dia(n.ganadoEn),
          perdidoEn: dia(n.perdidoEn),
          motivoPerdida: motivos.find((m) => m.id === n.motivoPerdidaId)?.nombre ?? null,
          competidor: n.competidor,
          etiquetas: etiquetas(n.id).map((t) => t.nombre),
          creadoEn: dia(n.createdAt) ?? "",
        };
      }),
    );
    return {
      nombre: `negocios-${new Date().toISOString().slice(0, 10)}.xlsx`,
      mime: MIME_XLSX,
      base64: Buffer.from(bytes).toString("base64"),
      total: negocios.length,
      truncado,
    };
  },
});

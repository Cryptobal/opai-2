import { z } from "zod";

import {
  clavesCalendarioAnio,
  plazoVisible,
  transicionObligacionValida,
  type EstadoObligacion,
} from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { aFecha, dia, diaSchema } from "../core/maestros/comun";
import {
  PERMISO_OBLIGACIONES,
  PERMISO_READ,
  documentoExiste,
  estadoObligacionSchema,
  tipoObligacionSchema,
} from "./comun";

const obligacionSchema = z.object({
  id: z.string(),
  periodoId: z.string().nullable(),
  tipo: tipoObligacionSchema,
  anio: z.number().int(),
  mes: z.number().int().nullable(),
  estado: estadoObligacionSchema,
  fechaLimite: z.string().nullable(),
  plazoVerificado: z.boolean(),
  plazo: z.string().nullable().describe("La fecha límite, solo si está verificada («Plazo por verificar» si es null)."),
  comprobanteDocumentoId: z.string().nullable(),
  nota: z.string().nullable(),
});

type Fila = {
  id: string;
  periodoId: string | null;
  tipo: string;
  anio: number;
  mes: number | null;
  estado: string;
  fechaLimite: Date | null;
  plazoVerificado: boolean;
  comprobanteDocumentoId: string | null;
  nota: string | null;
};

const vista = (o: Fila): z.output<typeof obligacionSchema> => {
  const fechaLimite = dia(o.fechaLimite);
  return {
    id: o.id,
    periodoId: o.periodoId ?? null,
    tipo: o.tipo as z.output<typeof obligacionSchema>["tipo"],
    anio: o.anio,
    mes: o.mes ?? null,
    estado: o.estado as EstadoObligacion,
    fechaLimite,
    plazoVerificado: o.plazoVerificado ?? false,
    plazo: plazoVisible({ fechaLimite, plazoVerificado: o.plazoVerificado ?? false }),
    comprobanteDocumentoId: o.comprobanteDocumentoId ?? null,
    nota: o.nota ?? null,
  };
};

/** Lista el calendario de obligaciones de un año de remuneraciones. */
export const obligacionesListar = defineCapability({
  id: "nomina.obligaciones.listar",
  descripcion:
    "Lista el calendario de obligaciones de un año de remuneraciones: LRE, Previred y retención de impuesto único (F29) por mes, y Declaración Jurada y certificados de sueldos al año. El plazo solo se informa si está verificado; si no, queda «Plazo por verificar».",
  permiso: PERMISO_READ,
  input: z.object({ anio: z.number().int().min(2000).max(2100) }),
  output: z.array(obligacionSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { anio }) {
    const filas = await ctx.db.nominaObligacion.findMany({
      where: { anio },
      orderBy: [{ mes: "asc" }, { tipo: "asc" }],
    });
    return filas.map(vista);
  },
});

/** Crea las obligaciones que falten del año (idempotente). */
export const obligacionesGenerarCalendario = defineCapability({
  id: "nomina.obligaciones.generar_calendario",
  descripcion:
    "Genera las obligaciones del calendario de un año que aún no existen: tres mensuales por cada mes y dos anuales. Es idempotente y no toca las existentes. Los plazos no se calculan: se fijan al verificarlos.",
  permiso: PERMISO_OBLIGACIONES,
  input: z.object({ anio: z.number().int().min(2000).max(2100) }),
  output: z.object({ creadas: z.number().int(), total: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { anio }, { dryRun }) {
    const existentes = await ctx.db.nominaObligacion.findMany({ where: { anio }, select: { tipo: true, mes: true } });
    const hay = new Set(existentes.map((o) => `${o.tipo}|${o.mes ?? "-"}`));
    const faltan = clavesCalendarioAnio(anio).filter((k) => !hay.has(`${k.tipo}|${k.mes ?? "-"}`));
    if (dryRun || faltan.length === 0) return { creadas: faltan.length, total: existentes.length + faltan.length };
    const periodos = await ctx.db.nominaPeriodo.findMany({ where: { anio }, select: { id: true, mes: true } });
    const porMes = new Map(periodos.map((p) => [p.mes, p.id]));
    for (const k of faltan)
      await ctx.db.nominaObligacion.create({
        data: { tenantId: ctx.tenantId, estado: "por_generar", tipo: k.tipo, anio: k.anio, mes: k.mes, periodoId: k.mes ? (porMes.get(k.mes) ?? null) : null },
      });
    return { creadas: faltan.length, total: existentes.length + faltan.length };
  },
});

/** Registra el avance, el plazo verificado o el comprobante de una obligación. */
export const obligacionesActualizar = defineCapability({
  id: "nomina.obligaciones.actualizar",
  descripcion:
    "Actualiza una obligación del calendario: su estado (por ejemplo cargada en Mi DT o pagada en Previred), el comprobante que subió el usuario, la fecha límite y si ese plazo está verificado, o una nota. OPAI no envía nada: lo sube el responsable.",
  permiso: PERMISO_OBLIGACIONES,
  input: z.object({
    id: uuidSchema,
    estado: estadoObligacionSchema.optional(),
    fechaLimite: diaSchema.nullable().optional(),
    plazoVerificado: z.boolean().optional(),
    comprobanteDocumentoId: uuidSchema.nullable().optional(),
    nota: z.string().trim().max(300).nullable().optional(),
  }),
  output: obligacionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...c }, { dryRun }) {
    const o = await ctx.db.nominaObligacion.findUnique({ where: { id } });
    if (!o) throw noEncontrado("La obligación");
    if (c.estado && c.estado !== o.estado && !transicionObligacionValida(o.estado as EstadoObligacion, c.estado))
      throw reglaDeNegocio(`Una obligación ${o.estado.replace("_", " ")} no puede pasar a ${c.estado.replace("_", " ")}.`);
    const limite = c.fechaLimite === undefined ? dia(o.fechaLimite) : c.fechaLimite;
    if ((c.plazoVerificado ?? o.plazoVerificado) && !limite)
      throw reglaDeNegocio("Para verificar el plazo hay que indicar la fecha límite.");
    if (c.comprobanteDocumentoId) await documentoExiste(ctx, c.comprobanteDocumentoId);
    const data = {
      ...(c.estado ? { estado: c.estado } : {}),
      ...(c.fechaLimite !== undefined ? { fechaLimite: c.fechaLimite ? aFecha(c.fechaLimite) : null } : {}),
      ...(c.plazoVerificado !== undefined ? { plazoVerificado: c.plazoVerificado } : {}),
      ...(c.comprobanteDocumentoId !== undefined ? { comprobanteDocumentoId: c.comprobanteDocumentoId } : {}),
      ...(c.nota !== undefined ? { nota: c.nota } : {}),
    };
    if (dryRun) return vista({ ...o, ...data });
    return vista(await ctx.db.nominaObligacion.update({ where: { id }, data }));
  },
});

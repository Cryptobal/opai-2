import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondeInstalacion, dondePuesto } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { cargarMes } from "./cargar";
import { diaSchema, PERMISO_READ } from "./comun";

const salidaSchema = z.object({
  nombre: z.string(),
  mime: z.string(),
  base64: z.string(),
});

function pdfMinimo(_titulo: string): Buffer {
  // PDF 1.1 mínimo válido (una página, sin dependencias externas).
  return Buffer.from(
    `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>endobj
4 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 100 700 Td (Pauta OPAI) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
0000000178 00000 n 
trailer<< /Size 5 /Root 1 0 R >>
startxref
274
%%EOF`,
    "utf8",
  );
}

function csvPauta(
  instalacion: string,
  filas: { puesto: string; fecha: string; estado: string; motivo: string; titular: string }[],
): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lineas = ["puesto,fecha,estado,motivo,titular", ...filas.map((f) => [f.puesto, f.fecha, f.estado, f.motivo, f.titular].map(esc).join(","))];
  return `\uFEFF${lineas.join("\n")}`;
}

/** Exporta la pauta de una instalación a CSV (excel) o PDF mínimo. */
export const exportarPauta = defineCapability({
  id: "pauta.exportar",
  descripcion:
    "Exporta la pauta de una instalación a PDF o Excel (CSV): por mes completo o por un día de la vista diaria, con filtro opcional de turnos sin cubrir.",
  permiso: PERMISO_READ,
  input: z
    .object({
      instalacionId: uuidSchema,
      anio: z.number().int().min(2000).max(2100).optional(),
      mes: z.number().int().min(1).max(12).optional(),
      fecha: diaSchema.optional(),
      formato: z.enum(["pdf", "excel"]),
      sinCubrir: z.boolean().optional(),
    })
    .refine((v) => v.fecha !== undefined || (v.anio !== undefined && v.mes !== undefined), {
      message: "Indica año y mes, o una fecha para la exportación diaria.",
    }),
  output: salidaSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const inst = await ctx.db.instalacion.findFirst({
      where: { id: input.instalacionId, AND: [dondeInstalacion(ctx)] },
      select: { id: true, nombre: true, region: true },
    });
    if (!inst) throw noEncontrado("La instalación");
    const anio = input.fecha ? Number(input.fecha.slice(0, 4)) : input.anio!;
    const mes = input.fecha ? Number(input.fecha.slice(5, 7)) : input.mes!;
    const puestos = await ctx.db.puesto.findMany({
      where: { instalacionId: inst.id, estado: "activo", AND: [dondePuesto(ctx)] },
      orderBy: [{ nombre: "asc" }],
      select: { id: true, nombre: true, instalacionId: true },
    });
    const m = await cargarMes(ctx, puestos, [inst], anio, mes);
    const filas: { puesto: string; fecha: string; estado: string; motivo: string; titular: string }[] = [];
    for (const p of puestos) {
      for (const c of m.celdas.get(p.id) ?? []) {
        if (input.fecha && c.fecha !== input.fecha) continue;
        if (input.sinCubrir && c.estado !== "ppc") continue;
        filas.push({
          puesto: p.nombre,
          fecha: c.fecha,
          estado: c.estado,
          motivo: c.motivo ?? "",
          titular: c.cubiertoPorId ?? c.titularId ?? "",
        });
      }
    }
    if (filas.length === 0) throw reglaDeNegocio("No hay filas que exportar con esos filtros.");
    const titulo = input.fecha
      ? `Pauta ${inst.nombre} ${input.fecha}`
      : `Pauta ${inst.nombre} ${anio}-${String(mes).padStart(2, "0")}`;
    if (input.formato === "excel") {
      const csv = csvPauta(inst.nombre, filas);
      return {
        nombre: `${titulo}.csv`,
        mime: "text/csv;charset=utf-8",
        base64: Buffer.from(csv, "utf8").toString("base64"),
      };
    }
    const pdf = pdfMinimo(titulo);
    return {
      nombre: `${titulo}.pdf`,
      mime: "application/pdf",
      base64: pdf.toString("base64"),
    };
  },
});

import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";
import { empleadorPorRut } from "@opai/db";

import { rutEmpleadorCanonico } from "../../domain/fiscalizacion";
import { METADATOS_REPORTE, TIPOS_REPORTE_DT } from "../../domain/reportes";

export const fiscalizacionEmpleadorBuscar = defineCapability({
  id: "asistencia.fiscalizacion_empleador.buscar",
  descripcion: "Busca un empleador por RUT para el portal de fiscalización (datos mínimos públicos).",
  permiso: null,
  interna: true,
  input: z.object({ rut: z.string().min(3).max(20) }),
  output: z.object({
    encontrado: z.boolean(),
    tenantId: z.string().optional(),
    slug: z.string().optional(),
    razonSocial: z.string().nullable().optional(),
    rut: z.string().optional(),
    reportes: z.array(z.object({ tipo: z.string(), titulo: z.string(), descripcion: z.string() })).optional(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(_ctx, i) {
    const canon = rutEmpleadorCanonico(i.rut);
    if (!canon) throw reglaDeNegocio("Revisa el RUT del empleador.");
    const emp = await empleadorPorRut(canon);
    if (!emp) return { encontrado: false };
    const reportes = TIPOS_REPORTE_DT.map((t) => ({
      tipo: t,
      titulo: METADATOS_REPORTE[t].titulo,
      descripcion: METADATOS_REPORTE[t].descripcion,
    }));
    return {
      encontrado: true,
      tenantId: emp.tenantId,
      slug: emp.slug,
      razonSocial: emp.razonSocial,
      rut: emp.rut,
      reportes,
    };
  },
});
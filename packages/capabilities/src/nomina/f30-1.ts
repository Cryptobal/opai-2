import { z } from "zod";

import { archivoF301 } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { datosArchivoPeriodo, personasReveladas, resultadoArchivo, salidaArchivo } from "./archivos-datos";
import { PERMISO_OBLIGACIONES } from "./comun";

// Certificado F30-1 (CAR-99): texto de cumplimiento laboral y previsional del período.
export const f301Generar = defineCapability({
  id: "nomina.f30_1.generar",
  descripcion:
    "Genera el certificado F30-1 del período a partir de las liquidaciones calculadas (totales del mes). Valida RUT del empleador. Formato por verificar ante Mi DT. La lectura queda auditada.",
  permiso: PERMISO_OBLIGACIONES,
  input: z.object({ periodoId: uuidSchema }),
  output: salidaArchivo(
    "Nombre del archivo: f30_1_rut_mmaaaa.txt.",
    "Texto plano con resumen del mes y declaración orientativa.",
    "el formato oficial F30-1 está por verificar.",
  ),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: personasReveladas,
  async handler(ctx, { periodoId }) {
    const datos = await datosArchivoPeriodo(ctx, periodoId, "F30-1");
    const perfil = await ctx.db.perfilEmpresa.findFirst({ select: { razonSocial: true } });
    const totalLiquido = datos.filas.reduce((s, f) => s + f.liquido, 0);
    const totalImponible = datos.filas.reduce((s, f) => s + (f.prevision?.basePrevisional ?? 0), 0);
    const a = archivoF301({
      rutEmpleador: datos.rutEmpleador,
      razonSocial: perfil?.razonSocial ?? null,
      anio: datos.periodo.anio,
      mes: datos.periodo.mes,
      resumen: { trabajadores: datos.filas.length, totalLiquido, totalImponible },
    });
    return resultadoArchivo(a, datos);
  },
});
import { z } from "zod";

import { archivoPrevired } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { datosArchivoPeriodo, personasReveladas, resultadoArchivo, salidaArchivo } from "./archivos-datos";
import { exigeComplementoCumplimientoDt } from "./complemento-dt";
import { PERMISO_OBLIGACIONES } from "./comun";

// Nómina de Previred (CAR-99): archivo de 105 campos del período para declarar y pagar cotizaciones.
// Mismos resguardos que el LRE: vista completa, sueldos sensibles y lectura auditada por personas.
// OPAI no envía ni paga nada en Previred (R11): lo carga el responsable.
export const previredGenerar = defineCapability({
  id: "nomina.previred.generar",
  descripcion:
    "Genera la nómina de Previred de un período (formato estándar de 105 campos separado por «;») con las liquidaciones calculadas: renta imponible, AFP, SIS, salud, seguro de cesantía y mutual por persona. Valida RUT, sexo y datos del empleador. Códigos de instituciones por verificar. La lectura queda auditada.",
  permiso: PERMISO_OBLIGACIONES,
  input: z.object({ periodoId: uuidSchema }),
  output: salidaArchivo(
    "Nombre del archivo: previred_rutempleador_mmaaaa.txt.",
    "Una línea de 105 campos por persona, sin encabezado.",
    "códigos y campos de la reforma por verificar.",
  ),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: personasReveladas,
  async handler(ctx, { periodoId }) {
    exigeComplementoCumplimientoDt(ctx);
    const datos = await datosArchivoPeriodo(ctx, periodoId, "Previred");
    const { periodo, filas, rutEmpleador } = datos;
    const a = archivoPrevired({
      rutEmpleador, anio: periodo.anio, mes: periodo.mes,
      filas: filas.map((f) => ({
        personaId: f.personaId, rut: f.persona.rut, apellidos: f.persona.apellidos, nombres: f.persona.nombres,
        sexo: f.persona.sexo, extranjero: f.persona.nacionalidad.toUpperCase() !== "CL",
        pensionado: f.ficha?.jubilado ?? false, diasTrabajados: f.diasTrabajados,
        ingresoEnMes: f.ingresoEnMes, retiroEnMes: f.terminoEnMes, tramoAsignacion: f.ficha?.tramo ?? null,
        cargas: { simples: f.ficha?.simples ?? 0, maternales: f.ficha?.maternales ?? 0, invalidez: f.ficha?.invalidez ?? 0 },
        prevision: f.prevision, descuentosLegales: f.descuentosLegales, aportesEmpleador: f.aportesEmpleador,
      })),
    });
    return resultadoArchivo(a, datos);
  },
});

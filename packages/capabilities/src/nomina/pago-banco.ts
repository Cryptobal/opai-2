import { z } from "zod";

import { archivoPagoBanco } from "@opai/domain";

import { ajuste } from "../core/config";
import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { reglaDeNegocio } from "../errores";
import { datosArchivoPeriodo, personasReveladas, resultadoArchivo, salidaArchivo } from "./archivos-datos";
import { PERMISO_OBLIGACIONES, periodoDe } from "./comun";
import { cuentasPagoPorPersona } from "./pago-banco-cuentas";

/** Archivo de pago bancario del período cerrado o pagado (CAR-99, diseño 06). */
export const pagoBancoGenerar = defineCapability({
  id: "nomina.pago_banco.generar",
  descripcion:
    "Genera el CSV de transferencias masivas con el líquido de cada liquidación y la cuenta bancaria por defecto de la persona. El formato depende del banco configurado en Ajustes y queda por verificar.",
  permiso: PERMISO_OBLIGACIONES,
  sensibles: ["contenido"],
  input: z.object({ periodoId: uuidSchema }),
  output: salidaArchivo(
    "Nombre del archivo: pago_banco_rut_mmaaaa.csv.",
    "CSV separado por «;» con RUT, cuenta y monto líquido.",
    "el layout del banco queda por verificar.",
  ),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: personasReveladas,
  async handler(ctx, { periodoId }) {
    const periodo = await periodoDe(ctx, periodoId);
    if (periodo.estado !== "cerrado" && periodo.estado !== "pagado") {
      throw reglaDeNegocio("El archivo de pago se genera con el período cerrado o pagado.");
    }
    const datos = await datosArchivoPeriodo(ctx, periodoId, "pago bancario");
    const cuentas = await cuentasPagoPorPersona(
      ctx,
      datos.filas.map((f) => f.personaId),
    );
    const erroresCuenta: { personaId: string | null; mensaje: string }[] = [];
    const filasPago = datos.filas.flatMap((f) => {
      const c = cuentas.get(f.personaId);
      if (!c?.numeroCuenta?.trim()) {
        erroresCuenta.push({
          personaId: f.personaId,
          mensaje: "Sin cuenta bancaria por defecto: no va en el archivo de pago.",
        });
        return [];
      }
      return [
        {
          personaId: f.personaId,
          rut: f.persona.rut,
          nombre: datos.nombres.get(f.personaId) ?? `${f.persona.nombres} ${f.persona.apellidos}`.trim(),
          bancoCodigo: c.bancoCodigo,
          tipoCuenta: c.tipoCuenta,
          numeroCuenta: c.numeroCuenta.trim(),
          montoClp: f.liquido,
        },
      ];
    });
    const formatoBanco = (await ajuste<string>(ctx, "nomina", "banco_pago")) ?? null;
    const archivo = archivoPagoBanco({
      rutEmpleador: datos.rutEmpleador,
      anio: datos.periodo.anio,
      mes: datos.periodo.mes,
      formatoBanco,
      filas: filasPago,
      erroresPrevios: erroresCuenta,
    });
    return resultadoArchivo(archivo, datos);
  },
});
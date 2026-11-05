// Validación y armado de filas de una programación a partir del input (BRIEF-26 · CAR-159).
import { cantidadEscalada, motivoNoActivable } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { aFecha } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { cuentaDe, instalacionDe } from "./ventas-comun";
import type { ProgramacionInput } from "./ventas-programacion-esquemas";

/** Verifica referencias del mismo tenant y reglas que el esquema no puede ver. */
export async function validarProgramacion(ctx: Contexto, input: ProgramacionInput) {
  await cuentaDe(ctx, input.cuentaId);
  if (input.instalacionId) await instalacionDe(ctx, input.instalacionId, input.cuentaId);
  if (input.destinatarioIds.length) {
    const n = await ctx.db.contacto.count({ where: { id: { in: input.destinatarioIds } } });
    if (n !== new Set(input.destinatarioIds).size) throw noEncontrado("Un destinatario");
  }
  if (input.fechaInicio && input.fechaFin && input.fechaFin < input.fechaInicio) {
    throw reglaDeNegocio("La fecha de fin es anterior a la de inicio.");
  }
  if (input.frecuencia === "anual" && !input.mesDelAnio) {
    throw reglaDeNegocio("La programación anual necesita el mes de generación.");
  }
  if (input.moneda === "UF" && input.politicaUf === "CUSTOM_DAY" && !input.diaUf) {
    throw reglaDeNegocio("Indica el día de la UF.");
  }
  const motivo = motivoNoActivable({
    tipoDte: input.tipoDte,
    cuentaId: input.cuentaId,
    lineas: input.lineas,
  });
  if (motivo) throw reglaDeNegocio(motivo);
}

/** Columnas de la programación (sin líneas ni destinatarios). */
export function datosProgramacion(input: ProgramacionInput) {
  return {
    nombre: input.nombre,
    cuentaId: input.cuentaId,
    instalacionId: input.instalacionId ?? null,
    tipoDte: input.tipoDte,
    frecuencia: input.frecuencia,
    diaGeneracion: input.diaGeneracion,
    diaSemana: input.diaSemana ?? null,
    mesDelAnio: input.mesDelAnio ?? null,
    moneda: input.moneda,
    politicaUf: input.moneda === "UF" ? (input.politicaUf ?? "RUN_DAY") : null,
    diaUf: input.moneda === "UF" ? (input.diaUf ?? null) : null,
    plazoPagoDias: input.plazoPagoDias,
    fechaInicio: input.fechaInicio ? aFecha(input.fechaInicio) : null,
    fechaFin: input.fechaFin ? aFecha(input.fechaFin) : null,
    notas: input.notas ?? null,
  };
}

/** Reemplaza líneas y destinatarios de la programación dentro de la transacción. */
export async function escribirDetalle(
  tx: TenantTx,
  tenantId: string,
  programacionId: string,
  input: ProgramacionInput,
) {
  await tx.ventasProgramacionLinea.deleteMany({ where: { programacionId } });
  await tx.ventasProgramacionDestinatario.deleteMany({ where: { programacionId } });
  await tx.ventasProgramacionLinea.createMany({
    data: input.lineas.map((l, orden) => {
      cantidadEscalada(l.cantidad);
      return {
        tenantId,
        programacionId,
        orden,
        glosa: l.glosa,
        cantidad: l.cantidad.replace(",", "."),
        unidad: l.unidad ?? null,
        precioUnitarioClp: input.moneda === "CLP" ? BigInt(l.precioUnitario) : null,
        precioUnitarioUf: input.moneda === "UF" ? BigInt(l.precioUnitario) : null,
        descuentoPct: l.descuentoPct,
        exento: l.exento,
      };
    }),
  });
  if (input.destinatarioIds.length) {
    await tx.ventasProgramacionDestinatario.createMany({
      data: [...new Set(input.destinatarioIds)].map((contactoId, orden) => ({
        tenantId,
        programacionId,
        contactoId,
        tipo: "para",
        orden,
      })),
    });
  }
}

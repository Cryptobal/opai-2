import { reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { bloqueosParaLista, type Bloqueo, type EntradaEstadoFicha } from "../domain/estado-ficha";
import type { EstadoCotizacion } from "../domain";
import type { ResultadoCalculo } from "../domain/motor";
import { fechaCalculoHoy } from "./fecha-calculo";
import { huellaJuego, juegoDesactualizado } from "./juego-vigente";
import { juegoParaFecha, mutualParaCalculo } from "./proveedor";

type LineaReq = { tipo: string; habilitada: boolean; sueldoBaseClp: number | null; huellaJuegoValores: string | null };

/** Los valores legales de hoy difieren de los que guardó el último cálculo de alguna línea. */
export async function valoresDesactualizados(ctx: Contexto, lineas: readonly LineaReq[]): Promise<boolean> {
  const resuelto = await juegoParaFecha(ctx, fechaCalculoHoy());
  const mutual = await mutualParaCalculo(ctx);
  return juegoDesactualizado(huellaJuego(resuelto.juego), lineas, mutual.confirmada);
}

/**
 * Entrada de la función pura de estado (CAR-192). La misma entrada alimenta el chip de la ficha, la
 * lista de pendientes y las capacidades `marcar_lista`, `solicitar_aprobacion` y enviar.
 */
export async function entradaEstadoFicha(
  ctx: Contexto,
  version: { estado: string },
  lineas: readonly LineaReq[],
  resultado: ResultadoCalculo,
): Promise<EntradaEstadoFicha> {
  return {
    estado: version.estado as EstadoCotizacion,
    hayLineas: lineas.some((l) => l.habilitada),
    costosPendientes: resultado.noEnviable,
    desactualizada: await valoresDesactualizados(ctx, lineas),
    margenBajo: resultado.requiereAprobacion,
  };
}

function rechazar(bloqueos: Bloqueo[]): never {
  const primero = bloqueos[0]!;
  throw reglaDeNegocio(bloqueos.map((b) => b.mensaje).join(" "), { codigo: primero.codigo });
}

/** «Dejar lista»: nada pendiente, valores al día y margen sobre el mínimo. */
export function exigirParaMarcarLista(entrada: EntradaEstadoFicha): void {
  const bloqueos = bloqueosParaLista(entrada);
  if (bloqueos.length) rechazar(bloqueos);
}

/** «Pedir aprobación»: todo resuelto salvo el margen, que debe estar bajo el mínimo. */
export function exigirParaPedirAprobacion(entrada: EntradaEstadoFicha): void {
  const bloqueos = bloqueosParaLista(entrada).filter((b) => b.codigo !== "margen_bajo");
  if (bloqueos.length) rechazar(bloqueos);
  if (!entrada.margenBajo)
    throw reglaDeNegocio("El margen no requiere aprobación; puedes dejarla lista o enviar.");
}

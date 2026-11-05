import type { Contexto } from "@opai/capabilities";

import type { EstadoCotizacion } from "../domain";
import { estadoFicha, type SalidaEstadoFicha } from "../domain/estado-ficha";
import type { ResultadoCalculo } from "../domain/motor";
import { esResultadoCalculoCompleto } from "./calculo-congelado";
import { fechaCalculoHoy } from "./fecha-calculo";
import { huellaJuego, juegoDesactualizado } from "./juego-vigente";
import { juegoParaFecha, mutualParaCalculo } from "./proveedor";

type VersionLista = {
  id: string;
  estado: string;
  calculoCongeladoJson: string | null;
};

export type EstadoLista = {
  /** El mismo estado único de la ficha; `null` si el cálculo guardado no alcanza para decidirlo. */
  estadoFicha: Pick<SalidaEstadoFicha, "estado" | "etiqueta"> | null;
  /** El cálculo guardado es completo y con margen creíble: solo entonces la lista muestra margen. */
  calculoConfiable: boolean;
  calculo: ResultadoCalculo | null;
};

function leerCalculo(json: string | null): ResultadoCalculo | null {
  if (!json) return null;
  try {
    const p: unknown = JSON.parse(json);
    return esResultadoCalculoCompleto(p) ? p : null;
  } catch {
    return null;
  }
}

/**
 * Estado y confiabilidad del cálculo guardado de cada versión de la lista (CAR-192). Usa la misma función
 * de estado único que la ficha. La lista no recalcula: si el JSON guardado es del formato antiguo (cuatro
 * campos, anterior a las reglas de #324) o su margen no es creíble, no se muestra margen y el estado de un
 * borrador queda sin decidir hasta que alguien recalcule la ficha. Sin migración de datos.
 */
export async function estadosDeLista(
  ctx: Contexto,
  versiones: readonly VersionLista[],
): Promise<Map<string, EstadoLista>> {
  const borradores = versiones.filter((v) => v.estado === "borrador");
  const lineasPorVersion = new Map<string, { tipo: string; habilitada: boolean; sueldoBaseClp: number | null; huellaJuegoValores: string | null }[]>();
  let huella: string | null = null;
  let mutualConfirmada = true;
  if (borradores.length) {
    const secciones = await ctx.db.cpqSeccion.findMany({
      where: { versionId: { in: borradores.map((v) => v.id) } },
      select: { id: true, versionId: true },
    });
    const lineas = secciones.length
      ? await ctx.db.cpqLinea.findMany({
          where: { seccionId: { in: secciones.map((s) => s.id) } },
          select: { seccionId: true, tipo: true, habilitada: true, sueldoBaseClp: true, huellaJuegoValores: true },
        })
      : [];
    const versionDe = new Map(secciones.map((s) => [s.id, s.versionId]));
    for (const l of lineas) {
      const v = versionDe.get(l.seccionId);
      if (v) lineasPorVersion.set(v, [...(lineasPorVersion.get(v) ?? []), l]);
    }
    if (borradores.some((v) => leerCalculo(v.calculoCongeladoJson))) {
      huella = huellaJuego((await juegoParaFecha(ctx, fechaCalculoHoy())).juego);
      mutualConfirmada = (await mutualParaCalculo(ctx)).confirmada;
    }
  }
  const salida = new Map<string, EstadoLista>();
  for (const v of versiones) {
    const calculo = leerCalculo(v.calculoCongeladoJson);
    const confiable =
      calculo !== null &&
      Boolean(calculo.ventaMensual) &&
      !calculo.noEnviable &&
      calculo.margenEfectivoPct > 0;
    const persistido = v.estado as EstadoCotizacion;
    let ficha: EstadoLista["estadoFicha"] = null;
    if (persistido !== "borrador") {
      ficha = estadoFicha({ estado: persistido, hayLineas: true, costosPendientes: false, desactualizada: false, margenBajo: false });
    } else {
      const lineas = lineasPorVersion.get(v.id) ?? [];
      if (!lineas.some((l) => l.habilitada)) {
        ficha = estadoFicha({ estado: persistido, hayLineas: false, costosPendientes: false, desactualizada: false, margenBajo: false });
      } else if (calculo) {
        ficha = estadoFicha({
          estado: persistido,
          hayLineas: true,
          costosPendientes: calculo.noEnviable,
          desactualizada: juegoDesactualizado(huella, lineas, mutualConfirmada),
          margenBajo: calculo.requiereAprobacion,
        });
      }
    }
    salida.set(v.id, {
      estadoFicha: ficha ? { estado: ficha.estado, etiqueta: ficha.etiqueta } : null,
      calculoConfiable: confiable,
      calculo,
    });
  }
  return salida;
}

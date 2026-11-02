import type { Contexto } from "@opai/capabilities";

import type { ResultadoCalculo } from "../domain/motor";
import { esEditable, type EstadoCotizacion } from "../domain";
import { costoLineaPuestoFicha } from "./costo-puesto-ficha";
import { fechaCalculoHoy } from "./fecha-calculo";
import { huellaJuego, juegoDesactualizado } from "./juego-vigente";
import { juegoParaFecha } from "./proveedor";
import { aprobacionPendiente } from "./aprobacion-margen";
import { evaluarAprobacionMargen } from "./aprobacion-reglas";

type FilaLinea = {
  id: string;
  tipo: string;
  nombre: string;
  sueldoBaseClp: number | null;
  huellaJuegoValores: string | null;
  [key: string]: unknown;
};

export async function metaFicha(
  ctx: Contexto,
  version: { id: string; estado: string; validaHasta: Date | null },
  lineas: readonly FilaLinea[],
  calculo: ResultadoCalculo,
) {
  const fechaCalculo = fechaCalculoHoy();
  const resuelto = await juegoParaFecha(ctx, fechaCalculo);
  const juego = resuelto.juego;
  const huella = huellaJuego(juego);
  const desactualizado = juegoDesactualizado(huella, lineas);
  const pend = version.estado === "en_aprobacion" ? await aprobacionPendiente(ctx, version.id) : null;
  const decision =
    pend != null ? evaluarAprobacionMargen(ctx, pend.solicitadaPorId) : null;
  const verCostos = ctx.autorizar("cpq:costos.ver");
  const costosLinea = verCostos
    ? Object.fromEntries(
        lineas
          .filter((l) => l.tipo === "puesto")
          .map((l) => [l.id, costoLineaPuestoFicha(l, juego)]),
      )
    : undefined;
  return {
    fechaCalculo,
    validaHastaContrato: version.validaHasta?.toISOString().slice(0, 10) ?? null,
    editable: esEditable(version.estado as EstadoCotizacion),
    avisoRecalculo: desactualizado
      ? {
          mensaje: "Cambiaron los valores legales desde el último cálculo.",
          huellaActual: huella,
        }
      : null,
    aprobacion: pend
      ? { id: pend.id, estado: pend.estado, solicitadaPorId: pend.solicitadaPorId }
      : null,
    puedeAprobarMargen: decision?.puedeDecidir ?? false,
    motivoNoAprobarMargen: decision?.motivoNoDecidir ?? null,
    puedeEnviar:
      !calculo.noEnviable &&
      version.estado !== "en_aprobacion" &&
      (version.estado === "lista" || !calculo.requiereAprobacion),
    requiereConfirmacionValoresViejos: desactualizado,
    costosLinea,
  };
}

export function trazaLinea(calculo: ResultadoCalculo, lineaId: string) {
  return calculo.traza.filter((t) => t.item === lineaId || t.monto === lineaId);
}

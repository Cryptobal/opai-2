import type { Contexto } from "@opai/capabilities";

import type { ResultadoCalculo } from "../domain/motor";
import { esEditable, type EstadoCotizacion } from "../domain";
import { costoLineaPuestoFicha } from "./costo-puesto-ficha";
import { fechaCalculoHoy } from "./fecha-calculo";
import { huellaJuego, juegoDesactualizado } from "./juego-vigente";
import { mutualBloqueaEnvio } from "./avisos-calculo";
import { juegoParaFecha, mutualParaCalculo } from "./proveedor";
import { aprobacionPendiente } from "./aprobacion-reglas";
import { evaluarAprobacionMargen } from "./aprobacion-reglas";
import { idBandejaCpq } from "./aprobaciones-bandeja-id";

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
  cotizacionId: string,
  creadoPorId: string,
  version: { id: string; estado: string; validaHasta: Date | null },
  lineas: readonly FilaLinea[],
  calculo: ResultadoCalculo,
) {
  const fechaCalculo = fechaCalculoHoy();
  const resuelto = await juegoParaFecha(ctx, fechaCalculo);
  const juego = resuelto.juego;
  const huella = huellaJuego(juego);
  const mutual = await mutualParaCalculo(ctx);
  const desactualizado = juegoDesactualizado(huella, lineas, mutual.confirmada);
  const pend = version.estado === "en_aprobacion" ? await aprobacionPendiente(ctx, version.id) : null;
  const decision = pend != null ? evaluarAprobacionMargen(ctx, creadoPorId) : null;
  const verCostos = ctx.autorizar("cpq:costos.ver");
  const costosLinea = verCostos
    ? Object.fromEntries(
        lineas
          .filter((l) => l.tipo === "puesto")
          .map((l) => [l.id, costoLineaPuestoFicha(l, juego, mutual.tasa)]),
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
      ? {
          id: pend.id,
          bandejaId: idBandejaCpq("margen", cotizacionId),
          estado: pend.estado,
          solicitadaPorId: pend.solicitadaPorId,
        }
      : null,
    puedeAprobarMargen: decision?.puedeDecidir ?? false,
    motivoNoAprobarMargen: decision?.motivoNoDecidir ?? null,
    autoaprobacionMargen: pend != null ? (decision?.autoaprobacion ?? false) : null,
    puedeEnviar:
      !calculo.noEnviable &&
      !mutualBloqueaEnvio(calculo) &&
      version.estado !== "en_aprobacion" &&
      (version.estado === "lista" || !calculo.requiereAprobacion),
    requiereConfirmacionValoresViejos: desactualizado,
    /** Enviar exige confirmar la mutual adicional (CAR-162); se confirma en Configuración › Remuneraciones. */
    requiereConfirmarMutual: mutualBloqueaEnvio(calculo),
    costosLinea,
  };
}

export function trazaLinea(calculo: ResultadoCalculo, lineaId: string) {
  return calculo.traza.filter((t) => t.item === lineaId || t.monto === lineaId);
}

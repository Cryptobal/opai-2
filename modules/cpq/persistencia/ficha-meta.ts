import type { Contexto } from "@opai/capabilities";

import type { ResultadoCalculo } from "../domain/motor";
import type { EstadoCotizacion } from "../domain";
import { estadoFicha, sePuedeCrearVersionNueva, sePuedeReabrir } from "../domain/estado-ficha";
import { costoLineaPuestoFicha, type LineaPuestoFicha } from "./costo-puesto-ficha";
import { fechaCalculoHoy } from "./fecha-calculo";
import { huellaJuego, juegoDesactualizado } from "./juego-vigente";
import { mutualBloqueaEnvio } from "./avisos-calculo";
import { juegoParaFecha, mutualParaCalculo } from "./proveedor";
import { supuestosTenant } from "./supuestos";
import { aprobacionPendiente } from "./aprobacion-reglas";
import { evaluarAprobacionMargen } from "./aprobacion-reglas";
import { idBandejaCpq } from "./aprobaciones-bandeja-id";

type FilaLinea = LineaPuestoFicha & { nombre: string; habilitada: boolean };

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
  const supuestos = verCostos ? await supuestosTenant(ctx) : undefined;
  const costosLinea = verCostos
    ? Object.fromEntries(
        lineas
          .filter((l) => l.tipo === "puesto")
          .map((l) => [l.id, costoLineaPuestoFicha(l, juego, mutual.tasa, supuestos)]),
      )
    : undefined;
  const estadoPersistido = version.estado as EstadoCotizacion;
  const estado = estadoFicha({
    estado: estadoPersistido,
    hayLineas: lineas.some((l) => l.habilitada),
    costosPendientes: calculo.noEnviable,
    desactualizada: desactualizado,
    margenBajo: calculo.requiereAprobacion,
  });
  const mutualPendiente = mutualBloqueaEnvio(calculo);
  return {
    fechaCalculo,
    /** Estado único y siguiente paso (CAR-192): alimenta el chip, los pendientes y las acciones. */
    estadoFicha: estado,
    puedeReabrir: sePuedeReabrir(estadoPersistido),
    puedeCrearVersion: sePuedeCrearVersionNueva(estadoPersistido),
    validaHastaContrato: version.validaHasta?.toISOString().slice(0, 10) ?? null,
    // Las capacidades de edición exigen borrador: no se ofrece editar lo que se rechazaría (CAR-192).
    editable: version.estado === "borrador",
    // Recalcular solo sirve en borrador: fuera de él la versión está congelada.
    avisoRecalculo: desactualizado && version.estado === "borrador"
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
      (estado.estado === "lista_para_enviar" || estado.estado === "por_dejar_lista") && !mutualPendiente,
    requiereConfirmacionValoresViejos: desactualizado,
    /** Enviar exige confirmar la mutual adicional (CAR-162); se confirma en Configuración › Remuneraciones. */
    requiereConfirmarMutual: mutualPendiente,
    costosLinea,
  };
}

export function trazaLinea(calculo: ResultadoCalculo, lineaId: string) {
  return calculo.traza.filter((t) => t.item === lineaId || t.monto === lineaId);
}

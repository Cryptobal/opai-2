import type { NegocioDetalle } from "../datos";

/** Campos que la hoja Mover puede completar para cumplir los requisitos de la etapa (R9). */
export type CampoRequisito = "monto" | "fecha_cierre" | "inicio_servicio";

/**
 * Qué requisitos de la etapa destino no cumple el negocio, entre los que se completan aquí. La
 * capacidad `comercial.negocios.mover` vuelve a validarlos todos: esto solo arma el formulario.
 */
export function camposFaltantes(exige: readonly string[], n: NegocioDetalle): CampoRequisito[] {
  const faltan: CampoRequisito[] = [];
  if (exige.includes("monto") && !(n.valorMensual ?? n.montoEstimadoMensual)) faltan.push("monto");
  if (exige.includes("fecha_cierre") && !n.cierreEstimado) faltan.push("fecha_cierre");
  if (exige.includes("inicio_servicio") && !n.inicioServicioEstimado)
    faltan.push("inicio_servicio");
  return faltan;
}

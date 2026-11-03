import { formatearNumero, indicadorUsado, liquidoABruto, minimoPorJornada } from "@opai/domain";
import { noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { fechaCalculoHoy } from "../persistencia/fecha-calculo";
import { entradaCostoDesdeLinea, juegoParaFecha, opcionesDeLinea, type LineaPuesto } from "../persistencia/proveedor";
import { sueldosReferenciaVigentes } from "../persistencia/sueldos-referencia";
import { supuestosTenant } from "../persistencia/supuestos";

/** Lo que la hoja de puesto pide cambiar y que decide el sueldo (subconjunto del input). */
export type PedidoPuesto = {
  cargoId?: string | null | undefined;
  sueldoBaseClp?: number | undefined;
  sueldoModo?: "bruto" | "liquido" | undefined;
  liquidoObjetivoClp?: number | null | undefined;
  diasSemana?: number[] | undefined;
};

/** Campos derivados que se escriben además de lo pedido. */
export type Derivados = { sueldoBaseClp?: number; sueldoOrigen?: string; diasCobertura?: number; diasSemana?: number[] };

/** Supuestos que influyen en el líquido → bruto (opcionales e indefinibles, como llegan del input). */
type Supuestos = { [K in "colacionClp" | "movilizacionClp" | "afp" | "saludTipo" | "saludPlanUf" | "tipoContrato"]?: LineaPuesto[K] };
type Previo = Supuestos & { cargoId?: string | null; sueldoModo?: string | null; liquidoObjetivoClp?: number | null };

/**
 * Resuelve el sueldo de la línea (R20, pregunta 1): al elegir un cargo sin sueldo escrito trae el sueldo
 * de referencia vigente («referencia_cargo»); un sueldo escrito queda «manual». En modo líquido objetivo
 * guarda el bruto calculado. Valida que el bruto no quede bajo el ingreso mínimo vigente.
 */
export async function resolverSueldoPuesto(
  ctx: Contexto,
  pedido: PedidoPuesto & Supuestos,
  previo: Previo | null,
): Promise<Derivados> {
  const d: Derivados = {};
  if (pedido.diasSemana) {
    const dias = [...new Set(pedido.diasSemana)].sort((a, b) => a - b);
    if (dias.length === 0) throw reglaDeNegocio("Elige al menos un día de cobertura.");
    Object.assign(d, { diasSemana: dias, diasCobertura: dias.length });
  }
  if (pedido.cargoId) {
    const cargo = await ctx.db.cargo.findFirst({ where: { id: pedido.cargoId }, select: { id: true } });
    if (!cargo) throw noEncontrado("El cargo");
  }
  const fecha = fechaCalculoHoy();
  const cambiaCargo = pedido.cargoId !== undefined && pedido.cargoId !== (previo?.cargoId ?? null);
  if (pedido.sueldoBaseClp !== undefined) Object.assign(d, { sueldoBaseClp: pedido.sueldoBaseClp, sueldoOrigen: "manual" });
  else if (cambiaCargo && pedido.cargoId) {
    const ref = (await sueldosReferenciaVigentes(ctx, fecha, [pedido.cargoId])).get(pedido.cargoId);
    if (ref) Object.assign(d, { sueldoBaseClp: ref.sueldoBaseClp, sueldoOrigen: "referencia_cargo" });
  }
  const modo = pedido.sueldoModo ?? previo?.sueldoModo ?? "bruto";
  const liquido = pedido.liquidoObjetivoClp !== undefined ? pedido.liquidoObjetivoClp : previo?.liquidoObjetivoClp;
  const { juego } = await juegoParaFecha(ctx, fecha);
  if (modo === "liquido" && liquido != null && juego) {
    const fila: LineaPuesto = { ...previo, ...pedido, patron: null, horaInicio: null, horaFin: null, id: "x", sueldoBaseClp: null };
    const opciones = opcionesDeLinea(fila, await supuestosTenant(ctx), 0);
    const r = liquidoABruto(entradaCostoDesdeLinea(0, opciones), liquido, juego);
    if (!r.alcanzable) throw reglaDeNegocio("Ese líquido objetivo no es alcanzable con un sueldo razonable.");
    Object.assign(d, { sueldoBaseClp: r.sueldoBaseClp, sueldoOrigen: d.sueldoOrigen ?? "manual" });
  }
  if (d.sueldoBaseClp && juego) {
    const imm = indicadorUsado(juego, "imm").valor;
    const minimo = minimoPorJornada(imm, 42 * 60, indicadorUsado(juego, "jornada").valor);
    if (d.sueldoBaseClp < minimo)
      throw reglaDeNegocio(`El sueldo base queda bajo el ingreso mínimo vigente ($ ${formatearNumero(minimo)}).`);
  }
  return d;
}

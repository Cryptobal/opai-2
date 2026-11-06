// Proyección única de ingresos del flujo (ADR-073): cobros de facturas, programaciones y depósitos del factor, sin
// contar dos veces lo que ya entró al banco y aún no está conciliado. Solo lectura.
import { emparejarAbonosConCobros, lunesDe, sumarDiasCobro } from "@opai/domain";

import type { Contexto } from "../types";
import { hoyChile, ingresosDeFacturas, type IngresoEsperado } from "./cobro-esperado-datos";
import { cesionesEsperadas, type DiferenciaFactoring } from "./factoring-esperado-datos";

export type AvisoFlujo = { tipo: "posible_cobro_recibido"; mensaje: string; abonoId: string; monto: number };

/** Ventana hacia atrás para los abonos que pudieron ser el depósito de un factor aún no conciliado. */
const DIAS_VENTANA_FACTOR = 28;
const clp = (n: number) => `$ ${n.toLocaleString("es-CL")}`;

export type ProyeccionIngresos = { items: IngresoEsperado[]; avisos: AvisoFlujo[]; diferenciasFactoring: DiferenciaFactoring[] };

/**
 * En la semana en curso una factura no se proyecta si un abono sin conciliar coincide con su pendiente y con el RUT del
 * cliente (ya está en el saldo del banco); sin coincidencia segura se mantiene y se avisa del posible cobro ya recibido.
 * Igual para el depósito esperado de una cesión (RUT del factor).
 */
export async function proyeccionDeIngresos(ctx: Contexto, hoy: string = hoyChile(), hastaSemana?: string): Promise<ProyeccionIngresos> {
  const lunesActual = lunesDe(hoy);
  const [facturas, { depositos, diferencias }] = await Promise.all([ingresosDeFacturas(ctx, hoy, hastaSemana), cesionesEsperadas(ctx, hoy)]);
  const reales = facturas.filter((i) => i.documentoEmitidoId && i.capa === "real" && i.semanaCobro === lunesActual);
  if (!reales.length && !depositos.length) return { items: [...facturas, ...depositos], avisos: [], diferenciasFactoring: diferencias };

  const cuentas = reales.length
    ? await ctx.db.cuenta.findMany({ where: { id: { in: [...new Set(reales.map((i) => i.cuentaId))] } }, select: { id: true, rut: true } })
    : [];
  const rutDe = new Map(cuentas.map((c) => [c.id, c.rut] as const));
  const desde = depositos.length ? sumarDiasCobro(lunesActual, -DIAS_VENTANA_FACTOR) : lunesActual;
  const movs = await ctx.db.movimientoBancario.findMany({
    where: { monto: { gt: 0n }, estado: { in: ["pendiente", "sugerido"] }, fecha: { gte: new Date(`${desde}T00:00:00Z`) } },
    select: { id: true, fecha: true, monto: true, glosa: true },
  });
  const abonos = movs.map((m) => ({ id: m.id, monto: Number(m.monto), glosa: m.glosa, fecha: m.fecha.toISOString().slice(0, 10) }));

  // Una sola pasada: las coincidencias seguras de facturas y depósitos van antes que cualquier «posible».
  const emparejados = emparejarAbonosConCobros({
    abonos,
    cobros: [
      ...reales.map((i) => ({ id: `f:${i.documentoEmitidoId}`, monto: i.monto, rut: rutDe.get(i.cuentaId) ?? null, desde: lunesActual })),
      ...depositos.map((d) => ({ id: `d:${d.cesionId}`, monto: d.monto, rut: d.rutFactor })),
    ],
  });
  const avisos = emparejados.posibles.map((p) => ({
    tipo: "posible_cobro_recibido" as const,
    mensaje: `Posible cobro ya recibido: concilia el abono de ${clp(p.monto)}`,
    abonoId: p.abonoId,
    monto: p.monto,
  }));
  return {
    items: [
      ...facturas.filter((i) => !i.documentoEmitidoId || !emparejados.seguros.has(`f:${i.documentoEmitidoId}`)),
      ...depositos.filter((d) => !emparejados.seguros.has(`d:${d.cesionId}`)),
    ],
    avisos,
    diferenciasFactoring: diferencias,
  };
}

/** Solo los ingresos, con el mismo criterio de semana y sin doble conteo. */
export async function ingresosEsperados(ctx: Contexto, hoy: string = hoyChile(), hastaSemana?: string): Promise<IngresoEsperado[]> {
  return (await proyeccionDeIngresos(ctx, hoy, hastaSemana)).items;
}

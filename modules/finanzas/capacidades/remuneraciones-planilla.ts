import { createHash } from "node:crypto";

import { executeCapability, hoyChile, type Contexto } from "@opai/capabilities";
import { finSemanaIso, formatearFecha } from "@opai/domain";

import type { CeldaFlujo } from "../domain";
import { agruparRemuneraciones, type ConceptoFlujo, type ItemRemuneracion } from "../domain/remuneraciones";
import type { celdaSchema } from "./esquemas";
import { FILA_ANTICIPO, FILA_PREVIRED, FILA_SUELDOS } from "./filas-virtuales";
import type { z } from "zod";

type Vista = z.infer<typeof celdaSchema>;

const CAPACIDAD = "nomina.costo_proyectado.listar";
const FILA: Record<ConceptoFlujo, string> = { sueldos: FILA_SUELDOS, anticipo: FILA_ANTICIPO, previred: FILA_PREVIRED };
const NOMBRE: Record<ConceptoFlujo, string> = { sueldos: "Sueldos", anticipo: "Anticipo de quincena", previred: "Previred" };
/** La lectura de Nómina acepta rangos de hasta 6 meses: se pide por tramos de 5 meses. */
const TRAMO_DIAS = 150;

const idEstable = (texto: string): string => {
  const h = createHash("sha1").update(texto).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const masDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

type Salida = { items: ItemRemuneracion[]; siguiente: string | null; advertencias: string[] };

/** Pagos proyectados entre dos fechas, página a página y por tramos. `null` si Nómina no está disponible para el actor. */
async function leerCosto(ctx: Contexto, desde: string, hasta: string): Promise<Salida | null> {
  const items: ItemRemuneracion[] = [];
  const advertencias = new Set<string>();
  for (let inicio = desde; inicio <= hasta; inicio = masDias(inicio, TRAMO_DIAS + 1)) {
    const fin = masDias(inicio, TRAMO_DIAS) < hasta ? masDias(inicio, TRAMO_DIAS) : hasta;
    let cursor: string | undefined;
    do {
      const r = await executeCapability(ctx, CAPACIDAD, { desde: inicio, hasta: fin, limite: 200, ...(cursor ? { cursor } : {}) });
      // Sin permiso de nómina, módulo apagado o capacidad ausente: el flujo sigue sin remuneraciones.
      if (!r.ok) return null;
      const datos = r.data as Salida;
      items.push(...datos.items);
      for (const a of datos.advertencias) advertencias.add(a);
      cursor = datos.siguiente ?? undefined;
    } while (cursor);
  }
  return { items, siguiente: null, advertencias: [...advertencias] };
}

/**
 * Remuneraciones proyectadas como egresos comprometidos (CAR-344): sueldos, anticipo de quincena y Previred desde
 * `nomina.costo_proyectado.listar`, en la semana de su fecha de pago. Solo desde hoy: lo anterior ya salió del banco y
 * lo trae la cartola. Respeta el permiso y el módulo de Nómina del actor (si no los tiene, las filas no aparecen) y
 * nunca muestra datos de personas, solo totales. Solo lectura.
 */
export async function celdasRemuneraciones(
  ctx: Contexto,
  semanas: readonly string[],
): Promise<{ dominio: CeldaFlujo[]; vista: Vista[] }> {
  const hoy = hoyChile();
  const ultima = semanas.at(-1);
  if (!ultima || finSemanaIso(ultima) < hoy) return { dominio: [], vista: [] };
  const leido = await leerCosto(ctx, hoy, finSemanaIso(ultima));
  if (!leido) return { dominio: [], vista: [] };
  const dominio: CeldaFlujo[] = [];
  const vista: Vista[] = [];
  for (const c of agruparRemuneraciones(leido.items, { desde: hoy, semanas })) {
    const filaId = FILA[c.concepto];
    dominio.push({ filaId, semana: c.semana, capa: "comprometido", monto: c.monto });
    const fechas = c.fechas.map((f) => formatearFecha(f)).join(", ");
    const nota = `${NOMBRE[c.concepto]} · se paga${c.fechas.length > 1 ? "n" : ""} el ${fechas} · ${c.personas} ${c.personas === 1 ? "persona" : "personas"}${c.estimado ? " · estimado desde los contratos" : ""}`;
    vista.push({ id: idEstable(`remuneraciones|${c.concepto}|${c.semana}`), filaId, semana: c.semana, capa: "comprometido", monto: c.monto, nota });
  }
  return { dominio, vista };
}

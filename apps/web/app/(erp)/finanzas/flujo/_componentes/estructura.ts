import { formatearClp } from "@opai/domain";
import type { Celda, FilaPlanilla } from "@opai/ds";

import { celdaAgregada } from "./celda-agregada";
import { FILA_COBROS_ESPERADOS } from "./cobros-celda";
import type { FilaFlujo, Planilla } from "./datos";
import { filasClientes, hayCobrosConCliente } from "./grupos-cobro";
import { GRUPO_POR_DEFECTO, GRUPOS_EGRESO } from "./grupos-egreso";

/**
 * Estructura contraíble de la planilla (CAR-537): Ingresos (por cliente e instalación) y Egresos en cuatro
 * grupos, cada encabezado con su subtotal por semana. Es la misma para escritorio y teléfono.
 */
export const SEC_INGRESOS = "sec:ingresos";
export const SEC_EGRESOS = "sec:egresos";
const GRUPO = "grp:";

/** Diferencia del factoring: informativa, no suma al saldo (igual que `FILA_DIFERENCIA_FACTORING` del módulo). */
const FILA_DIFERENCIA_FACTORING = "00000000-0000-4000-8000-000000000008";

export const esEncabezado = (filaId: string) => filaId === SEC_INGRESOS || filaId === SEC_EGRESOS || filaId.startsWith(GRUPO);

/** Abiertas por defecto: las secciones y los grupos. Los clientes empiezan sumados (cerrados). */
export const abiertaPorDefecto = (filaId: string) => !filaId.startsWith("cobro-");

const grupoDe = (f: FilaFlujo) => f.grupo ?? GRUPO_POR_DEFECTO;
const hoja = (f: FilaFlujo, nivel: 1 | 2): FilaPlanilla => ({ id: f.id, etiqueta: f.etiqueta, nivel });

function filasIngreso(p: Planilla, abierta: (id: string) => boolean): FilaPlanilla[] {
  return p.filas
    .filter((f) => f.seccion === "ingreso")
    .flatMap((f) =>
      f.id === FILA_COBROS_ESPERADOS && hayCobrosConCliente(p) ? filasClientes(p, abierta) : [hoja(f, 1)],
    );
}

function filasEgreso(p: Planilla, abierta: (id: string) => boolean): FilaPlanilla[] {
  const egresos = p.filas.filter((f) => f.seccion === "egreso");
  return GRUPOS_EGRESO.flatMap((g) => {
    const delGrupo = egresos.filter((f) => grupoDe(f) === g.valor);
    if (delGrupo.length === 0) return [];
    const id = `${GRUPO}${g.valor}`;
    const cabecera: FilaPlanilla = { id, etiqueta: g.etiqueta, nivel: 1, plegable: { abierta: abierta(id) } };
    return abierta(id) ? [cabecera, ...delGrupo.map((f) => hoja(f, 2))] : [cabecera];
  });
}

/** Filas visibles según qué encabezados están abiertos, sin los totales finales. */
export function filasEstructura(p: Planilla, abierta: (filaId: string) => boolean): FilaPlanilla[] {
  const seccion = (id: string, etiqueta: string): FilaPlanilla => ({ id, etiqueta, plegable: { abierta: abierta(id) } });
  return [
    seccion(SEC_INGRESOS, "Ingresos"),
    ...(abierta(SEC_INGRESOS) ? filasIngreso(p, abierta) : []),
    seccion(SEC_EGRESOS, "Egresos"),
    ...(abierta(SEC_EGRESOS) ? filasEgreso(p, abierta) : []),
  ];
}

/** Filas cuyas cifras suma un encabezado; la diferencia del factoring queda fuera porque no suma al saldo. */
function filasDe(p: Planilla, filaId: string): FilaFlujo[] {
  const sumables = p.filas.filter((f) => f.id !== FILA_DIFERENCIA_FACTORING);
  if (filaId === SEC_INGRESOS) return sumables.filter((f) => f.seccion === "ingreso");
  const egresos = sumables.filter((f) => f.seccion === "egreso");
  return filaId === SEC_EGRESOS ? egresos : egresos.filter((f) => grupoDe(f) === filaId.slice(GRUPO.length));
}

/** Subtotal de un encabezado en una semana: suma lo que muestran sus filas (sin el plan pasado sin respaldo). */
export function celdaEncabezado(p: Planilla, filaId: string, semana: string): Celda | null {
  const pasada = p.semanas.find((s) => s.semana === semana)?.pasada ?? false;
  let total = 0;
  let hay = false;
  for (const f of filasDe(p, filaId)) {
    const c = celdaAgregada(p.celdas, f.id, semana, pasada);
    if (!c || c.soloPlanSinRespaldo) continue;
    total += c.monto;
    hay = true;
  }
  return hay ? { texto: formatearClp(total), detalle: "Subtotal" } : null;
}

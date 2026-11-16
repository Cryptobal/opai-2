import { formatearClp } from "@opai/domain";
import type { Celda, FilaPlanilla } from "@opai/ds";

import { FILA_COBROS_ESPERADOS } from "./cobros-celda";
import type { CeldaFlujo, Planilla } from "./datos";

/**
 * Ingresos agrupados por cliente (CAR-456): los cobros esperados se muestran en una fila por cliente
 * y cada cliente en sus instalaciones. Las filas de grupo son de solo lectura y suman sus facturas.
 */
const CLIENTE = "cobro-cli:";
const INSTALACION = "cobro-ins:";
const SIN_INSTALACION = "sin";

type Grupo = { id: string; etiqueta: string; total: number; instalaciones: Map<string, { etiqueta: string; total: number }> };

const SIN_CLIENTE = { cuentaId: "sin", cuenta: "Sin cliente", instalacionId: null, instalacion: null };
/** Cliente del cobro; los cobros sin cliente resuelto van a «Sin cliente» para que las hijas sumen lo mismo que la fila. */
const deCobro = (c: CeldaFlujo) => (c.filaId === FILA_COBROS_ESPERADOS ? (c.cliente ?? SIN_CLIENTE) : null);

function agrupar(p: Planilla): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const c of p.celdas) {
    const cli = deCobro(c);
    if (!cli) continue;
    const g = grupos.get(cli.cuentaId) ?? { id: cli.cuentaId, etiqueta: cli.cuenta, total: 0, instalaciones: new Map() };
    g.total += c.monto;
    const instId = cli.instalacionId ?? SIN_INSTALACION;
    const inst = g.instalaciones.get(instId) ?? { etiqueta: cli.instalacion ?? "Sin instalación", total: 0 };
    inst.total += c.monto;
    g.instalaciones.set(instId, inst);
    grupos.set(cli.cuentaId, g);
  }
  return [...grupos.values()].sort((a, b) => b.total - a.total || a.etiqueta.localeCompare(b.etiqueta, "es"));
}

/** ¿La fila es un grupo de cobros (cliente o instalación)? */
export const esGrupoCobro = (filaId: string) => filaId.startsWith(CLIENTE) || filaId.startsWith(INSTALACION);

/** Las filas de cliente o instalación abren la hoja de «Cobros esperados» de su semana. */
export const filaBase = (filaId: string) => (esGrupoCobro(filaId) ? FILA_COBROS_ESPERADOS : filaId);

/** ¿Hay cobros con cliente para abrir «Cobros esperados» en clientes e instalaciones? */
export const hayCobrosConCliente = (p: Planilla) => p.celdas.some((c) => c.filaId === FILA_COBROS_ESPERADOS && !!c.cliente);

/** Filas de cliente (nivel 1) e instalación (nivel 2) de los cobros, según qué filas están abiertas. */
export function filasClientes(p: Planilla, abierta: (filaId: string) => boolean): FilaPlanilla[] {
  const out: FilaPlanilla[] = [];
  for (const g of agrupar(p)) {
    const idCli = `${CLIENTE}${g.id}`;
    const conDetalle = g.instalaciones.size > 1;
    out.push({
      id: idCli,
      etiqueta: g.etiqueta,
      nivel: 1,
      ...(conDetalle ? { plegable: { abierta: abierta(idCli) }, sub: `${g.instalaciones.size} instalaciones` } : {}),
    });
    if (!conDetalle || !abierta(idCli)) continue;
    const insts = [...g.instalaciones.entries()].sort(
      (a, b) => b[1].total - a[1].total || a[1].etiqueta.localeCompare(b[1].etiqueta, "es"),
    );
    for (const [instId, inst] of insts) {
      out.push({ id: `${INSTALACION}${g.id}:${instId}`, etiqueta: inst.etiqueta, nivel: 2 });
    }
  }
  return out;
}

/** Celda de un grupo en una semana: suma y cantidad de sus cobros; null si no tiene cobros esa semana. */
export function celdaGrupoCobro(p: Planilla, filaId: string, semana: string): Celda | null {
  const [cuentaId, instId] = filaId.startsWith(CLIENTE)
    ? [filaId.slice(CLIENTE.length), null]
    : filaId.slice(INSTALACION.length).split(":");
  let monto = 0;
  let cobros = 0;
  for (const c of p.celdas) {
    const cli = deCobro(c);
    if (!cli || c.semana !== semana || cli.cuentaId !== cuentaId) continue;
    if (instId != null && (cli.instalacionId ?? SIN_INSTALACION) !== instId) continue;
    monto += c.monto;
    cobros += 1;
  }
  if (!cobros) return null;
  return { texto: formatearClp(monto), tono: "info", detalle: `Comprometido · ${cobros} ${cobros === 1 ? "cobro" : "cobros"}` };
}

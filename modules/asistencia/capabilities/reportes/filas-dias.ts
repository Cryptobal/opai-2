import type { Contexto } from "@opai/capabilities";

import { columnasAsistencia, columnasJornadaDiaria, mapFilaDia } from "./map-fila-dia";
import { type FiltroFilas, whereDiasConsulta } from "./filas-comun";

export async function filasDesdeDias(
  ctx: Contexto,
  filtro: FiltroFilas,
  alcance: { instalacionId?: { in: string[] } },
  zona: string,
  jornadaDiaria: boolean,
) {
  const dias = await ctx.db.dia.findMany({
    where: whereDiasConsulta(filtro, alcance),
    orderBy: [{ fecha: "asc" }, { personaId: "asc" }],
  });
  const siglas = new Set<string>();
  let provisorio = false;
  const filas = dias.map((d) => {
    const { fila, sigla, provisorio: p } = mapFilaDia(d, zona, jornadaDiaria);
    if (sigla) siglas.add(sigla);
    if (p) provisorio = true;
    return fila;
  });
  const columnas = jornadaDiaria ? [...columnasJornadaDiaria] : [...columnasAsistencia];
  return { columnas, filas, siglasUsadas: [...siglas], provisorio };
}
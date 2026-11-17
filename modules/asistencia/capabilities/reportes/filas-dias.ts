import type { Contexto } from "@opai/capabilities";

import { minutosAHhMm, segundosAHHMMSS } from "../../domain/reportes";
import { diaSemana, horaZona, type Col, type Fila, type FiltroFilas } from "./filas-comun";
import { rangoDias } from "./esquema";

export async function filasDesdeDias(
  ctx: Contexto,
  filtro: FiltroFilas,
  alcance: { instalacionId?: { in: string[] } },
  zona: string,
  jornadaDiaria: boolean,
) {
  const whereDia = {
    fecha: rangoDias(filtro.desde, filtro.hasta),
    ...(filtro.personaId ? { personaId: filtro.personaId } : {}),
    AND: [alcance, filtro.instalacionId ? { instalacionId: filtro.instalacionId } : {}],
  };
  const dias = await ctx.db.dia.findMany({ where: whereDia, orderBy: [{ fecha: "asc" }, { personaId: "asc" }] });
  const siglas = new Set<string>();
  let provisorio = false;
  const filas: Fila[] = dias.map((d) => {
    if (d.sigla) siglas.add(d.sigla);
    if (d.correccionPendiente) provisorio = true;
    const base = {
      fecha: d.fecha.toISOString().slice(0, 10),
      dia: diaSemana(d.fecha, zona),
      sigla: d.sigla ?? "—",
      corregida: d.correccionPendiente ? "Pendiente" : "",
    };
    if (jornadaDiaria) {
      return {
        ...base,
        entrada: horaZona(d.entrada, zona),
        salida: horaZona(d.salida, zona),
        atraso: segundosAHHMMSS(d.segundosAtraso),
        sobretiempo: d.segundosExtra > 0 ? segundosAHHMMSS(d.segundosExtra) : "—",
        horas: minutosAHhMm(d.minutosTrabajados),
      };
    }
    return {
      ...base,
      entrada: horaZona(d.entrada, zona),
      salida: horaZona(d.salida, zona),
      horas: minutosAHhMm(d.minutosTrabajados),
      extra: d.segundosExtra > 0 ? segundosAHHMMSS(d.segundosExtra) : "—",
    };
  });
  const columnas: Col[] = jornadaDiaria
    ? [
        { clave: "fecha", etiqueta: "Fecha" },
        { clave: "entrada", etiqueta: "Entrada" },
        { clave: "salida", etiqueta: "Salida" },
        { clave: "horas", etiqueta: "Horas" },
        { clave: "atraso", etiqueta: "Atraso" },
        { clave: "sobretiempo", etiqueta: "H.E." },
        { clave: "sigla", etiqueta: "Sigla" },
      ]
    : [
        { clave: "fecha", etiqueta: "Fecha" },
        { clave: "dia", etiqueta: "Día" },
        { clave: "entrada", etiqueta: "Entrada" },
        { clave: "salida", etiqueta: "Salida" },
        { clave: "horas", etiqueta: "Horas" },
        { clave: "extra", etiqueta: "H.E." },
        { clave: "sigla", etiqueta: "Sigla" },
        { clave: "corregida", etiqueta: "Corrección" },
      ];
  return { columnas, filas, siglasUsadas: [...siglas], provisorio };
}
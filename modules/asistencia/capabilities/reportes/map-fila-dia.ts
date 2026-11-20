import { minutosAHhMm, segundosAHHMMSS } from "../../domain/reportes";
import { diaSemana, horaZona, type Fila } from "./filas-comun";

type DiaRow = {
  fecha: Date;
  entrada: Date | null;
  salida: Date | null;
  segundosAtraso: number;
  segundosExtra: number;
  minutosTrabajados: number;
  sigla: string | null;
  correccionPendiente: boolean;
};

export function mapFilaDia(d: DiaRow, zona: string, jornadaDiaria: boolean): { fila: Fila; sigla?: string; provisorio: boolean } {
  const base = {
    fecha: d.fecha.toISOString().slice(0, 10),
    dia: diaSemana(d.fecha, zona),
    sigla: d.sigla ?? "—",
    corregida: d.correccionPendiente ? "Pendiente" : "",
  };
  const sigla = d.sigla ?? undefined;
  const provisorio = d.correccionPendiente;
  if (jornadaDiaria) {
    return {
      fila: {
        ...base,
        entrada: horaZona(d.entrada, zona),
        salida: horaZona(d.salida, zona),
        atraso: segundosAHHMMSS(d.segundosAtraso),
        sobretiempo: d.segundosExtra > 0 ? segundosAHHMMSS(d.segundosExtra) : "—",
        horas: minutosAHhMm(d.minutosTrabajados),
      },
      ...(sigla ? { sigla } : {}),
      provisorio,
    };
  }
  return {
    fila: {
      ...base,
      entrada: horaZona(d.entrada, zona),
      salida: horaZona(d.salida, zona),
      horas: minutosAHhMm(d.minutosTrabajados),
      extra: d.segundosExtra > 0 ? segundosAHHMMSS(d.segundosExtra) : "—",
    },
    ...(sigla ? { sigla } : {}),
    provisorio,
  };
}

export const columnasJornadaDiaria = [
  { clave: "fecha", etiqueta: "Fecha" },
  { clave: "entrada", etiqueta: "Entrada" },
  { clave: "salida", etiqueta: "Salida" },
  { clave: "horas", etiqueta: "Horas" },
  { clave: "atraso", etiqueta: "Atraso" },
  { clave: "sobretiempo", etiqueta: "H.E." },
  { clave: "sigla", etiqueta: "Sigla" },
] as const;

export const columnasAsistencia = [
  { clave: "fecha", etiqueta: "Fecha" },
  { clave: "dia", etiqueta: "Día" },
  { clave: "entrada", etiqueta: "Entrada" },
  { clave: "salida", etiqueta: "Salida" },
  { clave: "horas", etiqueta: "Horas" },
  { clave: "extra", etiqueta: "H.E." },
  { clave: "sigla", etiqueta: "Sigla" },
  { clave: "corregida", etiqueta: "Corrección" },
] as const;
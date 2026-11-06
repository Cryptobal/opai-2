// Día consolidado (recalculable) de una persona: fuente de Nómina y de «Asistencia de hoy».
// Parte de las marcas ya con su valor efectivo (correcciones aplicadas, contingencias aceptadas).
import { atrasoSegundos, colacionMinutos, salidaAnticipadaSegundos, sobretiempoSegundos, trabajadosSegundos } from "./calculo";
import { descansoInsuficiente, type TipoJornada } from "./jornadas";
import { estadoDelDia, siglaDelDia, type EstadoDia, type Sigla } from "./siglas";
import type { TipoMarca } from "./tipos";

export type MarcaEfectiva = { tipo: TipoMarca; hora: Date };

export type EntradaConsolidar = {
  turno: { inicio: Date; fin: Date } | null;
  marcas: readonly MarcaEfectiva[];
  tipoJornada: TipoJornada;
  colacion: { jornadaPactadaMin: number | null; puestoMin: number | null };
  ausenciaRegistrada?: Sigla | undefined;
  salidaPrevia: Date | null;
  ahora: Date;
};

export type DiaConsolidado = {
  estado: EstadoDia;
  sigla: Sigla | null;
  minutosTrabajados: number;
  segundosAtraso: number;
  segundosExtra: number;
  segundosSalidaAnticipada: number;
  descansoInsuficiente: boolean;
  entrada: Date | null;
  salida: Date | null;
};

const porHora = (a: MarcaEfectiva, b: MarcaEfectiva) => a.hora.getTime() - b.hora.getTime();

/** Primera entrada y última salida del día; sin redondeo (art. 44). */
export function consolidarDia(e: EntradaConsolidar): DiaConsolidado {
  const orden = [...e.marcas].sort(porHora);
  const entrada = orden.find((m) => m.tipo === "entrada")?.hora ?? null;
  const salida = [...orden].reverse().find((m) => m.tipo === "salida" && (!entrada || m.hora > entrada))?.hora ?? null;
  const atraso = e.turno && entrada ? atrasoSegundos(e.turno.inicio, entrada) : 0;
  const extra = e.turno && salida ? sobretiempoSegundos(e.turno.fin, salida) : 0;
  const anticipada = e.turno && salida ? salidaAnticipadaSegundos(e.turno.fin, salida) : 0;
  const entrada_ = { hayTurno: e.turno !== null, hayEntrada: entrada !== null, haySalida: salida !== null, ausenciaRegistrada: e.ausenciaRegistrada, sobretiempoS: extra };
  const turnoTermino = e.turno ? e.ahora.getTime() >= e.turno.fin.getTime() : true;
  const trabajados =
    entrada && salida ? Math.floor(trabajadosSegundos(entrada, salida, colacionMinutos(e.colacion)) / 60) : 0;
  return {
    estado: estadoDelDia(entrada_, turnoTermino),
    sigla: siglaDelDia(entrada_),
    minutosTrabajados: trabajados,
    segundosAtraso: atraso,
    segundosExtra: extra,
    segundosSalidaAnticipada: anticipada,
    descansoInsuficiente: entrada ? descansoInsuficiente(e.tipoJornada, e.salidaPrevia, entrada) : false,
    entrada,
    salida,
  };
}

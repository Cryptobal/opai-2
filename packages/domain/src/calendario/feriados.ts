// Feriados legales nacionales de Chile calculados por regla, para cualquier año y sin tabla por año
// (CAR-79/CAR-76/CAR-80; decisión de Carlos del 30-oct-2026: los feriados legales se calculan solos y
// la tabla core.dias_calendario queda solo para feriados por ley puntual y días propios del tenant).
// Cada feriado trae la ley y la regla que lo fija. Lo astronómico (solsticio) y el traslado de las
// Iglesias Evangélicas se marcan `porVerificar` para el contraste anual contra la fuente oficial.

import type { DiaCalendarioEntrada } from "./dias";
import { diaSemana, iso, sumarDias } from "./fechas";
import { domingoDePascua } from "./pascua";
import { solsticioJunio } from "./solsticio";

export type FeriadoLegal = {
  fecha: string; // aaaa-mm-dd
  nombre: string;
  irrenunciable: boolean;
  /** Ley que fija el feriado (texto de negocio, para auditoría y para el contraste anual). */
  ley: string;
  /** true si la fecha depende de un cálculo a contrastar cada año con la fuente oficial. */
  porVerificar: boolean;
};

const d = (anio: number, mes: number, dia: number): string =>
  iso(new Date(Date.UTC(anio, mes - 1, dia)));

/**
 * Traslado de la Ley 19.668: un feriado que cae martes, miércoles o jueves se corre al lunes de esa
 * misma semana; si cae viernes, al lunes de la semana siguiente; sábado, domingo o lunes no se mueve.
 */
function trasladoLey19668(fecha: string): string {
  const dow = diaSemana(fecha); // 0 dom … 6 sáb
  if (dow === 2 || dow === 3 || dow === 4) return sumarDias(fecha, 1 - dow); // martes/mié/jue → lunes
  if (dow === 5) return sumarDias(fecha, 3); // viernes → lunes siguiente
  return fecha;
}

/**
 * Día de las Iglesias Evangélicas (31-oct), Leyes 20.299 y 20.983: si el 31 cae martes se traslada al
 * viernes de la semana anterior (27-oct); si cae miércoles, al viernes de esa semana (2-nov); el resto
 * de los días se queda en el 31. Devuelve [fecha, seTrasladó].
 */
function iglesiasEvangelicas(anio: number): [string, boolean] {
  const base = d(anio, 10, 31);
  const dow = diaSemana(base);
  if (dow === 2) return [sumarDias(base, -4), true]; // martes → viernes anterior (27-oct)
  if (dow === 3) return [sumarDias(base, 2), true]; // miércoles → viernes siguiente (2-nov)
  return [base, false];
}

/** Feriados nacionales legales de Chile del año, ordenados por fecha (CAR-79). */
export function feriadosLegales(anio: number): FeriadoLegal[] {
  const pascua = domingoDePascua(anio);
  const [evangelicas, evTrasladada] = iglesiasEvangelicas(anio);
  const lista: FeriadoLegal[] = [
    { fecha: d(anio, 1, 1), nombre: "Año Nuevo", irrenunciable: true, ley: "Ley 19.973 (irrenunciable)", porVerificar: false },
    { fecha: sumarDias(pascua, -2), nombre: "Viernes Santo", irrenunciable: false, ley: "Feriado religioso (Ley 2.977); fecha por el domingo de Pascua", porVerificar: false },
    { fecha: sumarDias(pascua, -1), nombre: "Sábado Santo", irrenunciable: false, ley: "Feriado religioso (Ley 2.977); fecha por el domingo de Pascua", porVerificar: false },
    { fecha: d(anio, 5, 1), nombre: "Día Nacional del Trabajo", irrenunciable: true, ley: "Ley 19.973 (irrenunciable)", porVerificar: false },
    { fecha: d(anio, 5, 21), nombre: "Día de las Glorias Navales", irrenunciable: false, ley: "Ley 2.977", porVerificar: false },
    { fecha: solsticioJunio(anio), nombre: "Día Nacional de los Pueblos Indígenas", irrenunciable: false, ley: "Ley 21.357 (solsticio de invierno)", porVerificar: true },
    { fecha: trasladoLey19668(d(anio, 6, 29)), nombre: "San Pedro y San Pablo", irrenunciable: false, ley: "Ley 19.668 (trasladable)", porVerificar: false },
    { fecha: d(anio, 7, 16), nombre: "Día de la Virgen del Carmen", irrenunciable: false, ley: "Ley 20.148", porVerificar: false },
    { fecha: d(anio, 8, 15), nombre: "Asunción de la Virgen", irrenunciable: false, ley: "Ley 2.977", porVerificar: false },
    { fecha: d(anio, 9, 18), nombre: "Independencia Nacional", irrenunciable: true, ley: "Ley 19.973 (irrenunciable)", porVerificar: false },
    { fecha: d(anio, 9, 19), nombre: "Día de las Glorias del Ejército", irrenunciable: true, ley: "Ley 19.973 (irrenunciable)", porVerificar: false },
    { fecha: trasladoLey19668(d(anio, 10, 12)), nombre: "Encuentro de Dos Mundos", irrenunciable: false, ley: "Ley 19.668 (trasladable)", porVerificar: false },
    { fecha: evangelicas, nombre: "Día de las Iglesias Evangélicas y Protestantes", irrenunciable: false, ley: "Leyes 20.299 y 20.983", porVerificar: evTrasladada },
    { fecha: d(anio, 11, 1), nombre: "Día de Todos los Santos", irrenunciable: false, ley: "Ley 2.977", porVerificar: false },
    { fecha: d(anio, 12, 8), nombre: "Inmaculada Concepción", irrenunciable: false, ley: "Ley 2.977", porVerificar: false },
    { fecha: d(anio, 12, 25), nombre: "Navidad", irrenunciable: true, ley: "Ley 19.973 (irrenunciable)", porVerificar: false },
  ];
  // Feriados adicionales de Fiestas Patrias (Ley 20.215): lunes 17 si el 18 cae martes; viernes 20 si
  // el 19 cae jueves (ambos son excluyentes: 18 y 19 son días consecutivos).
  if (diaSemana(d(anio, 9, 18)) === 2)
    lista.push({ fecha: d(anio, 9, 17), nombre: "Feriado adicional Fiestas Patrias", irrenunciable: false, ley: "Ley 20.215", porVerificar: false });
  if (diaSemana(d(anio, 9, 19)) === 4)
    lista.push({ fecha: d(anio, 9, 20), nombre: "Feriado adicional Fiestas Patrias", irrenunciable: false, ley: "Ley 20.215", porVerificar: false });
  return lista.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

/** Los feriados legales del año como entradas del resolvedor (todos nacionales, de plataforma). */
export function feriadosLegalesComoEntradas(anio: number): DiaCalendarioEntrada[] {
  return feriadosLegales(anio).map((f) => ({
    fecha: f.fecha,
    nombre: f.nombre,
    irrenunciable: f.irrenunciable,
    fuente: "nacional",
    region: null,
    esTenant: false,
  }));
}

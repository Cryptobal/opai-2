/** Titulares de un puesto (`pauta.titulares.listar`) y vista previa de asignar (`pauta.titular.asignar`). */
export type TitularesPuesto = {
  puestoId: string;
  patronId: string | null;
  titularActualId: string | null;
  items: {
    serieId: string;
    titularId: string | null;
    titular: string | null;
    patron: string;
    inicioCiclo: string;
    desde: string;
    hasta: string | null;
    fijadaPor: string | null;
    fijadaEn: string | null;
  }[];
  candidatos: { id: string; nombre: string }[];
  destinos: { id: string; etiqueta: string }[];
};

export type PrevisualizacionTitular = {
  serie: { patron: string; desde: string; titular: string | null };
  serieAnteriorHasta: string | null;
  titularAnterior: { id: string; nombre: string } | null;
  primerosDias: { fecha: string; trabaja: boolean }[];
};

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
/** "2026-11-09" → "09-11-2026" (fecha civil, sin zona horaria). */
export const fechaCl = (iso: string) => iso.split("-").reverse().join("-");
/** Día de la semana abreviado de una fecha civil. */
export const diaCorto = (iso: string) => DIAS[new Date(`${iso}T12:00:00Z`).getUTCDay()]!;
/** Fecha y hora de una marca de tiempo, en hora de Chile. */
export const cuandoCl = (iso: string) =>
  new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(",", "")
    .replaceAll("/", "-");
/** Hoy en la zona de Chile (aaaa-mm-dd). */
export const hoyCl = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());

export type PrevisualizacionTraslado = {
  mismaInstalacion: boolean;
  puestosOrigen: { puestoId: string; puesto: string; serieHasta: string }[];
  vinculoTerminado: { id: string; termino: string } | null;
  vinculoNuevo: boolean;
  faltaJornada: boolean;
  titularDesplazado: { id: string; nombre: string } | null;
  serie: { patron: string; desde: string };
  primerosDias: { fecha: string; trabaja: boolean }[];
};

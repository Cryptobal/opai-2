/** Borrador de un esquema de cobertura en la pantalla (CAR-212) y sus validaciones en línea. */
export type TramoBorrador = {
  clave: string;
  nombre: string;
  patronId: string;
  horaInicio: string;
  horaFin: string;
  diasSemana: number[];
  posiciones: number;
};

export type ErroresTramo = { patronId?: string; posiciones?: string; nombre?: string; dias?: string; horario?: string };
export type ErroresBorrador = { nombre?: string; tramos: ErroresTramo[]; general?: string };

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Total de puestos del esquema: suma de los puestos de cada tramo. */
export function totalPuestos(tramos: readonly Pick<TramoBorrador, "posiciones">[]): number {
  return tramos.reduce((a, t) => a + (Number.isInteger(t.posiciones) && t.posiciones > 0 ? t.posiciones : 0), 0);
}

/** Un tramo cruza la medianoche cuando termina antes de empezar (p. ej. 20:00–08:00). */
export function cruzaMedianoche(inicio: string, fin: string): boolean {
  return HORA.test(inicio) && HORA.test(fin) && fin <= inicio;
}

/** Valida el borrador contra los nombres ya usados y los ciclos vigentes; `ok` solo sin errores. */
export function validarBorrador(
  nombre: string,
  tramos: readonly TramoBorrador[],
  opts: { nombresUsados: readonly string[]; ciclosVigentes: readonly string[] },
): { ok: boolean; errores: ErroresBorrador } {
  const errores: ErroresBorrador = { tramos: [] };
  const limpio = nombre.trim().toLowerCase();
  if (limpio === "") errores.nombre = "Escribe un nombre.";
  else if (opts.nombresUsados.some((n) => n.trim().toLowerCase() === limpio)) errores.nombre = "Ya hay un esquema con ese nombre.";
  if (tramos.length === 0) errores.general = "Agrega al menos un tramo.";
  let ok = !errores.nombre && !errores.general;
  for (const t of tramos) {
    const e: ErroresTramo = {};
    if (t.nombre.trim() === "") e.nombre = "Escribe el nombre del tramo.";
    if (!opts.ciclosVigentes.includes(t.patronId)) e.patronId = "Ese ciclo no existe. Elige uno de la lista.";
    if (!Number.isInteger(t.posiciones) || t.posiciones < 1) e.posiciones = "El tramo necesita al menos 1 puesto.";
    if (t.diasSemana.length === 0) e.dias = "Elige al menos un día.";
    if (!HORA.test(t.horaInicio) || !HORA.test(t.horaFin) || t.horaInicio === t.horaFin) e.horario = "Revisa el horario.";
    if (Object.keys(e).length > 0) ok = false;
    errores.tramos.push(e);
  }
  return { ok, errores };
}

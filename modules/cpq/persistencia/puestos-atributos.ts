import { type Contexto, noEncontrado, reglaDeNegocio } from "@opai/capabilities";
import { horaValida, horasSemanalesSugeridas, patronValido, type DefinicionPatron } from "@opai/domain";

import type { LineaOferta } from "./puestos-oferta";
import type { PedidoPuesto } from "./puestos-resolver";

/** Ciclo del puesto: el patrón elegido o del catálogo; si no, el «NxM» escrito en la línea. */
export async function cicloDe(ctx: Contexto, patronId: string | null, texto: string | null, linea: string) {
  if (patronId) {
    const p = await ctx.db.patronTurno.findUnique({ where: { id: patronId } });
    if (!p) throw noEncontrado("El patrón de turno");
    if (!p.activo) throw reglaDeNegocio(`El patrón "${p.nombre}" está desactivado.`);
    const definicion: DefinicionPatron = {
      nombre: p.nombre,
      clase: p.clase === "semanal" ? "semanal" : "ciclico",
      diasTrabajo: p.diasTrabajo,
      diasDescanso: p.diasDescanso,
      diasSemana: p.diasSemana,
    };
    return { patronId: p.id, diasTrabajo: p.diasTrabajo, diasDescanso: p.diasDescanso, definicion };
  }
  const m = texto ? /^(\d{1,2})\s*[x×]\s*(\d{1,2})$/i.exec(texto.trim()) : null;
  const [t, d] = m ? [Number(m[1]), Number(m[2])] : [0, 0];
  if (!m || !patronValido(t, d))
    throw reglaDeNegocio(`Elige el patrón de turno de «${linea}»: la cotización no trae uno válido.`);
  const definicion: DefinicionPatron = {
    nombre: `${t}×${d}`, clase: "ciclico", diasTrabajo: t, diasDescanso: d, diasSemana: [],
  };
  return { patronId: null, diasTrabajo: t, diasDescanso: d, definicion };
}


/**
 * Función, tramo de noche y horas semanales de un puesto por crear. La función viene del catálogo
 * del núcleo y el tramo de noche del encargo de RR. HH.; las horas salen del cálculo único del
 * dominio (turnos.ts), el mismo de la Pauta y de Asistencia (ADR-078).
 */
export async function atributosPuesto(
  ctx: Contexto,
  p: PedidoPuesto,
  l: LineaOferta,
  definicion: DefinicionPatron,
  horaInicio: string,
  horaFin: string,
) {
  let funcionId: string | null = null;
  if (p.funcionId) {
    const f = await ctx.db.funcionPuesto.findUnique({ where: { id: p.funcionId } });
    if (!f) throw noEncontrado("La función del puesto");
    if (!f.activo) throw reglaDeNegocio(`La función "${f.nombre}" está desactivada.`);
    funcionId = f.id;
  }
  const hayNoche = Boolean(p.horaInicioNoche || p.horaFinNoche);
  const ini = p.horaInicioNoche;
  const fin = p.horaFinNoche;
  if (hayNoche && (!ini || !fin || !horaValida(ini) || !horaValida(fin)))
    throw reglaDeNegocio(`El tramo de noche de «${l.linea}» necesita hora de inicio y de término (de 00:00 a 23:59).`);
  const noche = hayNoche && ini && fin ? { ini, fin } : null;
  const horasSemanales = horasSemanalesSugeridas({
    patron: definicion,
    tramos: [{ horaInicio, horaFin }, ...(noche ? [{ horaInicio: noche.ini, horaFin: noche.fin }] : [])],
    colacionMin: 0,
    colacionFuera: false,
  });
  return { funcionId, noche, horasSemanales };
}

import type { Contexto } from "../../types";
import { resolverAcceso } from "./acceso-ingesta";
import { resolverAsistencia } from "./asistencia-ingesta";
import type { Equipo, Hecho, Tiempo } from "./acceso-tipos";
import type { MotivoRechazo } from "./hechos-evaluar";
import { resolverEjecuciones } from "./rondas-ejecucion";
import { resolverMarcas } from "./rondas-marca";
import { novedadesDelLibro } from "./libro-novedades-cola";
import { resolverNovedades } from "./rondas-novedades";
import { escribirHechosProyectados } from "./proyecciones-escribir";

export type Proyecciones = {
  /** Hechos que el servidor no puede resolver (QR ajeno, documento inválido, módulo inactivo…). */
  rechazos: ReadonlyMap<string, MotivoRechazo>;
  /** Hechos que dependen de un hecho del mismo lote que terminó rechazado (p. ej. el cierre de un inicio caído). */
  dependientesDe: (caidas: ReadonlySet<string>) => Map<string, MotivoRechazo>;
  /** Escribe, dentro de la transacción del lote, lo que nace de cada hecho aceptado. */
  escribir: (
    tx: Contexto["db"],
    nuevos: readonly Hecho[],
    desfaseMs: number,
    aceptadas: ReadonlySet<string>,
  ) => Promise<void>;
};

/**
 * Proyecciones de los hechos de terreno hacia los módulos (Rondas, Control de acceso) y el libro de novedades. Cada hecho se guarda una
 * sola vez en `core.hechos_terreno`; aquí se decide qué rechazar y qué fila inmutable nace junto con él.
 */
export async function prepararProyecciones(
  ctx: Contexto,
  equipo: Equipo,
  hechos: readonly Hecho[],
  t: Tiempo,
): Promise<Proyecciones> {
  const marcas = await resolverMarcas(ctx, equipo.instalacionId, hechos);
  const asistencia = await resolverAsistencia(ctx, equipo, hechos);
  const acceso = await resolverAcceso(ctx, equipo, hechos, t);
  const rondas = await resolverEjecuciones(ctx, equipo, hechos, t);
  const novedades = await resolverNovedades(ctx, equipo, hechos, t);
  const libro = novedadesDelLibro(ctx, equipo, hechos, t);
  const rechazos = new Map<string, MotivoRechazo>([
    ...acceso.rechazos,
    ...asistencia.rechazos,
    ...rondas.rechazos,
    ...novedades.rechazos,
  ]);
  for (const [clave, m] of marcas) if ("motivo" in m) rechazos.set(clave, m.motivo);
  return {
    rechazos,
    dependientesDe: (caidas) => rondas.dependientesDe(caidas),
    escribir: async (tx, nuevos, _desfaseMs, aceptadas) => {
      await escribirHechosProyectados(
        ctx,
        equipo,
        t,
        marcas,
        rondas,
        novedades,
        acceso,
        tx,
        nuevos,
        aceptadas,
      );
      await libro(tx, aceptadas);
    },
  };
}

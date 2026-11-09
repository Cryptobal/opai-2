import type { Contexto } from "../../types";
import { resolverAcceso } from "./acceso-ingesta";
import type { Equipo, Hecho, Tiempo } from "./acceso-tipos";
import type { MotivoRechazo } from "./hechos-evaluar";
import { resolverEjecuciones } from "./rondas-ejecucion";
import { resolverMarcas } from "./rondas-marca";
import { resolverNovedades } from "./rondas-novedades";

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
 * Proyecciones de los hechos de terreno hacia los módulos (Rondas, Control de acceso). Cada hecho se guarda una
 * sola vez en `core.hechos_terreno`; aquí se decide qué rechazar y qué fila inmutable nace junto con él.
 */
export async function prepararProyecciones(
  ctx: Contexto,
  equipo: Equipo,
  hechos: readonly Hecho[],
  t: Tiempo,
): Promise<Proyecciones> {
  const marcas = await resolverMarcas(ctx, equipo.instalacionId, hechos);
  const acceso = await resolverAcceso(ctx, equipo, hechos, t);
  const rondas = await resolverEjecuciones(ctx, equipo, hechos, t);
  const novedades = await resolverNovedades(ctx, equipo, hechos);
  const rechazos = new Map<string, MotivoRechazo>([
    ...acceso.rechazos,
    ...rondas.rechazos,
    ...novedades.rechazos,
  ]);
  for (const [clave, m] of marcas) if ("motivo" in m) rechazos.set(clave, m.motivo);
  return {
    rechazos,
    dependientesDe: (caidas) => rondas.dependientesDe(caidas),
    async escribir(tx, nuevos, _desfaseMs, aceptadas) {
      const ids = await rondas.iniciar(tx, aceptadas);
      const filas = nuevos.flatMap((h) => {
        const m = marcas.get(h.clave);
        if (!m || !("marca" in m)) return [];
        const { puntoId, geocerca, distanciaM, precisionM, anomalias } = m.marca;
        return [
          {
            tenantId: ctx.tenantId,
            instalacionId: equipo.instalacionId,
            dispositivoId: equipo.id,
            clave: h.clave,
            personaId: h.personaId ?? null,
            horaCorregida: t.corregir(new Date(h.horaHecho)),
            puntoId,
            geocerca,
            distanciaM,
            precisionM,
            anomalias,
            ejecucionId: m.marca.ejecucionClave ? (ids.get(m.marca.ejecucionClave) ?? null) : null,
          },
        ];
      });
      if (filas.length > 0) await tx.marcaRonda.createMany({ skipDuplicates: true, data: filas });
      await rondas.cerrar(tx, aceptadas, ids);
      await novedades.escribir(tx, aceptadas, ids);
      await acceso.escribir(tx, aceptadas);
    },
  };
}

import type { Contexto } from "../../types";
import type { Equipo, Hecho, Tiempo } from "./acceso-tipos";
import type { ResolucionMarca } from "./rondas-marca";
import type { EjecucionesResueltas } from "./rondas-ejecucion";
import type { NovedadesResueltas } from "./rondas-novedades";
import type { AccesoResuelto } from "./acceso-ingesta";
import { emitirAnomalias } from "./rondas-senales";

/** Persiste marcas, cierres, novedades y acceso dentro de la transacción del lote. */
export async function escribirHechosProyectados(
  ctx: Contexto,
  equipo: Equipo,
  t: Tiempo,
  marcas: ReadonlyMap<string, ResolucionMarca>,
  rondas: EjecucionesResueltas,
  novedades: NovedadesResueltas,
  acceso: AccesoResuelto,
  tx: Contexto["db"],
  nuevos: readonly Hecho[],
  aceptadas: ReadonlySet<string>,
): Promise<void> {
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
  const creadas = filas.length
    ? await tx.marcaRonda.createManyAndReturn({
        skipDuplicates: true,
        data: filas,
        select: {
          id: true,
          puntoId: true,
          personaId: true,
          anomalias: true,
          ejecucionId: true,
        },
      })
    : [];
  await emitirAnomalias(tx, ctx.eventos, equipo.instalacionId, creadas);
  await rondas.cerrar(tx, aceptadas, ids);
  await novedades.escribir(tx, aceptadas, ids);
  await acceso.escribir(tx, aceptadas);
}
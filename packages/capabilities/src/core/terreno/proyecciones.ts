import type { Contexto } from "../../types";
import { resolverAcceso } from "./acceso-ingesta";
import type { Equipo, Hecho, Tiempo } from "./acceso-tipos";
import type { MotivoRechazo } from "./hechos-evaluar";
import { resolverMarcas } from "./rondas-marca";

export type Proyecciones = {
  /** Hechos que el servidor no puede resolver (QR ajeno, documento inválido, módulo inactivo…). */
  rechazos: ReadonlyMap<string, MotivoRechazo>;
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
  const rechazos = new Map<string, MotivoRechazo>(acceso.rechazos);
  for (const [clave, m] of marcas) if ("motivo" in m) rechazos.set(clave, m.motivo);
  return {
    rechazos,
    async escribir(tx, nuevos, _desfaseMs, aceptadas) {
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
          },
        ];
      });
      if (filas.length > 0) await tx.marcaRonda.createMany({ skipDuplicates: true, data: filas });
      await acceso.escribir(tx, aceptadas);
    },
  };
}

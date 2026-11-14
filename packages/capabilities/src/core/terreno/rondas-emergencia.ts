import type { Contexto } from "../../types";
import type { Equipo, Hecho, Rechazos, Tiempo } from "./acceso-tipos";
import { TIPOS_HECHO_TERRENO } from "./hechos-tipos";
import { senalRonda } from "./rondas-senales";

export type EmergenciasResueltas = {
  rechazos: Rechazos;
  /** Emite `rondas.emergencia` por cada alerta aceptada de este lote; `ids` es clave de ronda → id. */
  emitir: (
    tx: Contexto["db"],
    aceptadas: ReadonlySet<string>,
    ids: ReadonlyMap<string, string>,
  ) => Promise<void>;
};

/**
 * Botón «Emergencia» por la cola (CAR-501). Siempre avisa (decisión 21 de Rondas): no depende de ninguna
 * configuración del tenant, solo de tener Rondas activo. El hecho queda en `core.hechos_terreno` (inmutable) y la
 * señal va a la Central con la instalación, la persona declarada, la ronda si vino y la ubicación si la hubo.
 */
export function resolverEmergencias(
  ctx: Contexto,
  equipo: Equipo,
  hechos: readonly Hecho[],
  t: Tiempo,
): EmergenciasResueltas {
  const rechazos: Rechazos = new Map();
  const alertas = hechos.flatMap((h) => {
    const r =
      h.tipo === "rondas.emergencia"
        ? TIPOS_HECHO_TERRENO["rondas.emergencia"].safeParse(h.payload)
        : null;
    return r?.success ? [{ h, p: r.data }] : [];
  });
  if (alertas.length > 0 && !ctx.modulosActivos.includes("rondas")) {
    for (const { h } of alertas) rechazos.set(h.clave, "modulo_inactivo");
    return { rechazos, emitir: async () => undefined };
  }
  return {
    rechazos,
    async emitir(tx, aceptadas, ids) {
      for (const { h, p } of alertas.filter((a) => aceptadas.has(a.h.clave))) {
        const clave = p.ejecucionClave;
        const ejecucionId = !clave
          ? null
          : (ids.get(clave) ??
            (
              await tx.ejecucionRonda.findFirst({
                where: { dispositivoId: equipo.id, clave },
                select: { id: true },
              })
            )?.id ??
            null);
        await ctx.eventos.emitir(tx, {
          tipo: "rondas.emergencia",
          entidadTipo: "hecho_terreno",
          entidadId: h.clave,
          payload: {
            ...senalRonda(equipo.instalacionId, h.personaId),
            dispositivoId: equipo.id,
            ejecucionId,
            ubicacion: p.lectura ?? null,
            hora: t.corregir(new Date(h.horaHecho)).toISOString(),
          },
        });
      }
    },
  };
}

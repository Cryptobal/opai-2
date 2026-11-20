import type { Contexto } from "../../types";

/**
 * Payload base de las señales de Rondas que vigila la Central (CAR-501): la instalación siempre y la persona solo si
 * se conoce. La Central valida `personaId` como uuid opcional, así que nunca se manda `null`.
 */
export const senalRonda = (instalacionId: string, personaId: string | null | undefined) => ({
  instalacionId,
  ...(personaId ? { personaId } : {}),
});

/** Una marca nueva con anomalías (fuera de geocerca, QR lejos de su punto, etiqueta reemplazada) es una señal. */
export async function emitirAnomalias(
  tx: Contexto["db"],
  eventos: Contexto["eventos"],
  instalacionId: string,
  marcas: readonly {
    id: string;
    puntoId: string;
    personaId: string | null;
    anomalias: string[];
    ejecucionId: string | null;
  }[],
): Promise<void> {
  for (const m of marcas.filter((x) => x.anomalias.length > 0)) {
    await eventos.emitir(tx, {
      tipo: "rondas.anomalia.detectada",
      entidadTipo: "marca_ronda",
      entidadId: m.id,
      payload: {
        ...senalRonda(instalacionId, m.personaId),
        puntoId: m.puntoId,
        anomalias: m.anomalias,
        ejecucionId: m.ejecucionId,
      },
    });
  }
}

import { VENTANA_TIPO_HORAS, type MarcaPrevia, type TipoMarca } from "./tipos";

/**
 * Qué marca toca ahora: alterna entrada y salida mirando las últimas 26 h (cubre 12×12 y turnos
 * nocturnos que cruzan la medianoche). Sin marcas en la ventana, o si la última fue una salida,
 * toca entrada. Tras una entrada o el fin de una colación, toca salida; tras el inicio de una
 * colación, toca el fin de la colación. El inicio de colación no se propone solo: lo pide quien marca.
 */
export function resolverTipo(previas: readonly MarcaPrevia[], ahora: Date): TipoMarca {
  const desde = ahora.getTime() - VENTANA_TIPO_HORAS * 3_600_000;
  const recientes = previas
    .filter((m) => m.horaServidor.getTime() >= desde && m.horaServidor.getTime() <= ahora.getTime())
    .sort((a, b) => b.horaServidor.getTime() - a.horaServidor.getTime());
  const ultima = recientes[0];
  if (!ultima || ultima.tipo === "salida") return "entrada";
  if (ultima.tipo === "inicio_colacion") return "fin_colacion";
  return "salida";
}

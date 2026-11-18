import { remuneracionesIndicadoresConfirmar, remuneracionesMutualConfirmar } from "./confirmar";
import { remuneracionesHistorial } from "./historial";
import { remuneracionesIndicadoresListar } from "./listar";
import { platformIndicadoresPropuestas, platformIndicadoresResolver } from "./previsional-plataforma";

export const capacidadesRemuneraciones = [
  remuneracionesIndicadoresListar,
  remuneracionesHistorial,
  remuneracionesIndicadoresConfirmar,
  remuneracionesMutualConfirmar,
  platformIndicadoresPropuestas,
  platformIndicadoresResolver,
];

export { clavesFaltantes, mutualAdicionalTenant, publicacionesParaFecha } from "./publicaciones";
export { trabajoCapturaIndicadoresSii } from "./trabajo-captura";
export { trabajoCapturaPrevisional } from "./trabajo-captura-previsional";

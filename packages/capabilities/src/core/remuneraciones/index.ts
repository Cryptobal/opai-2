import { remuneracionesIndicadoresConfirmar, remuneracionesMutualConfirmar } from "./confirmar";
import { remuneracionesHistorial } from "./historial";
import { remuneracionesIndicadoresListar } from "./listar";

export const capacidadesRemuneraciones = [
  remuneracionesIndicadoresListar,
  remuneracionesHistorial,
  remuneracionesIndicadoresConfirmar,
  remuneracionesMutualConfirmar,
];

export { clavesFaltantes, mutualAdicionalTenant, publicacionesParaFecha } from "./publicaciones";
export { trabajoCapturaIndicadoresSii } from "./trabajo-captura";

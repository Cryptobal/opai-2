import type { Capacidad } from "../../types";
import { notificacionesList, notificacionesMarcarLeida, notificacionesMarcarTodas } from "./inbox";
import { comunicacionesEventos, plantillasGet } from "./plantillas";
import {
  plantillasEnviarPrueba,
  plantillasPreview,
  plantillasUpdate,
} from "./plantillas-escritura";
import { notificacionReglasList, notificacionReglasSet } from "./reglas";

export { consumidorComunicaciones } from "./consumidor";
export { enviarCorreo, previsualizarCorreo } from "./envio";

export const capacidadesComunicaciones: readonly Capacidad[] = [
  comunicacionesEventos,
  plantillasGet,
  plantillasUpdate,
  plantillasPreview,
  plantillasEnviarPrueba,
  notificacionReglasList,
  notificacionReglasSet,
  notificacionesList,
  notificacionesMarcarLeida,
  notificacionesMarcarTodas,
];

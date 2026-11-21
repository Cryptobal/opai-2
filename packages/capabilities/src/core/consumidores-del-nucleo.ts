import { consumidorAnexos } from "./anexos";
import { consumidorRevocacionBiometria } from "./biometria";
import { consumidorSeguimientoAviso } from "../comercial/seguimiento-aviso";
import { consumidoresPausaSeguimiento } from "../comercial/seguimiento-pausas";
import { consumidorTareaVencida } from "./crm/actividades-vencidas";
import { consumidorFirmaDocumento } from "./firmas";
import { consumidorSolicitudCreada } from "../comercial/consumidor-solicitud";
import { consumidorNegocioGanado } from "../comercial/consumidor-ganado";
import { consumidorCpqGanado } from "../comercial/consumidor-ganado-cpq";
import { consumidorPropuestaAlAceptar } from "../portal-cliente/propuesta-al-aceptar";
import { consumidorComunicaciones } from "./comunicaciones";
import { consumidorProcesosPersona } from "./procesos-persona";
import { consumidoresSlack } from "./slack";
import { consumidorWebhooks } from "./webhooks";
import { consumidorTurnosEsperados } from "./turnos";
import {
  consumidorAccesoPortalTrabajador,
  consumidorVinculoPortalTrabajador,
} from "./maestros/consumidor-acceso-portal";

/** Consumidores de eventos del núcleo que registra el borde. */
export const consumidoresDelNucleo = [
  consumidorComunicaciones,
  consumidorAnexos,
  consumidorFirmaDocumento,
  consumidorSolicitudCreada,
  consumidorTareaVencida,
  consumidorSeguimientoAviso,
  ...consumidoresPausaSeguimiento,
  consumidorNegocioGanado,
  consumidorCpqGanado,
  consumidorPropuestaAlAceptar,
  consumidorTurnosEsperados,
  consumidorRevocacionBiometria,
  ...consumidoresSlack,
  consumidorProcesosPersona,
  consumidorAccesoPortalTrabajador,
  consumidorVinculoPortalTrabajador,
  consumidorWebhooks,
];
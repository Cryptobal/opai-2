import { alertasAbrir } from "./abrir";
import { alertasContactar, alertasEscalar, alertasHacerseCargo } from "./atencion";
import { cadenasGuardar, cadenasListar } from "./cadenas";
import { agentePausar, agenteReanudar, alertasDevolver, alertasTomar } from "./control";
import { alertasProponer, propuestasListar, propuestasResolver } from "./propuestas";
import { reglasGuardar, reglasListar } from "./reglas";
import { turnoAbrir, turnoAceptar, turnoCerrar, turnoEntregar } from "./turno";
import { turnoEstado } from "./turno-estado";
import {
  alertasFalsaAlarma,
  alertasPosponer,
  alertasReabrir,
  alertasResolver,
} from "./escritura";
import { centralEstado } from "./estado";
import { alertasListar, alertasObtener } from "./lectura";
import { avisosAcusar, avisosCrear } from "./avisos";
import { avisosListar, avisosObtener } from "./avisos-lectura";
import { mensajesCerrar, mensajesEnviar, mensajesResponder } from "./mensajes";
import { mensajesListar, mensajesObtener } from "./mensajes-lectura";
import {
  confirmacionListar,
  confirmacionObtener,
  confirmacionPoliticaObtener,
} from "./confirmacion-lectura";
import { confirmacionMarcarSinRespuesta, confirmacionPoliticaGuardar } from "./confirmacion-politica";
import { confirmacionRegistrar, confirmacionResponder } from "./confirmacion";

/** Capacidades de la Central. Cada una se expone igual en UI, API /api/v1 y MCP (ADR-004). */
export const capacidades = [
  centralEstado,
  alertasListar,
  alertasObtener,
  alertasAbrir,
  alertasResolver,
  alertasFalsaAlarma,
  alertasReabrir,
  alertasPosponer,
  alertasHacerseCargo,
  alertasContactar,
  alertasEscalar,
  cadenasListar,
  cadenasGuardar,
  reglasListar,
  reglasGuardar,
  turnoEstado,
  turnoAbrir,
  turnoEntregar,
  turnoAceptar,
  turnoCerrar,
  alertasTomar,
  alertasDevolver,
  agentePausar,
  agenteReanudar,
  alertasProponer,
  propuestasListar,
  propuestasResolver,
  mensajesEnviar,
  mensajesResponder,
  mensajesCerrar,
  mensajesListar,
  mensajesObtener,
  avisosCrear,
  avisosAcusar,
  avisosListar,
  avisosObtener,
  confirmacionRegistrar,
  confirmacionResponder,
  confirmacionMarcarSinRespuesta,
  confirmacionPoliticaGuardar,
  confirmacionListar,
  confirmacionObtener,
  confirmacionPoliticaObtener,
];

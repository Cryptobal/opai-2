import { trabajoAlertasArt45, trabajoAvisoCompensables } from "./alertas-art45";
import { trabajoVerificarCadenaMarcas } from "./cadena";
import { consumidorAlertas } from "./consumidor-alertas";
import { consumidorAvisoCorreccion, consumidorComprobante } from "./consumidores";
import { contingenciasListar, contingenciasRegistrar, contingenciasResolver } from "./contingencias";
import { correccionesVerEnlace, correccionesResponderEnlace } from "./correcciones-enlace";
import { correccionesListar } from "./correcciones-listar";
import { correccionesProponer } from "./correcciones-proponer";
import { correccionesResponder } from "./correcciones-responder";
import { trabajoVencerCorrecciones } from "./correcciones-trabajo";
import { incidentesCerrar, incidentesListar, incidentesRegistrar } from "./incidentes";
import { marcasObtener, marcasListar } from "./lecturas";
import { marcasRegistrar } from "./registrar";
import { marcasVerificar } from "./verificar";

export { ajustesAsistencia } from "./ajustes";
export { fijarVerificadorIdentidad, PIN_SIMULADO } from "./identidad-registro";
export const trabajosAsistencia = [trabajoVerificarCadenaMarcas, trabajoVencerCorrecciones, trabajoAlertasArt45, trabajoAvisoCompensables];
export const consumidoresAsistencia = [consumidorComprobante, consumidorAvisoCorreccion, consumidorAlertas];
export const capacidades = [
  marcasRegistrar, marcasListar, marcasObtener, marcasVerificar,
  correccionesProponer, correccionesListar, correccionesResponder, correccionesVerEnlace, correccionesResponderEnlace,
  contingenciasRegistrar, contingenciasListar, contingenciasResolver,
  incidentesRegistrar, incidentesCerrar, incidentesListar,
];

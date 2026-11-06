import { trabajoAlertasArt45, trabajoAvisoCompensables } from "./alertas-art45";
import { trabajoVerificarCadenaMarcas } from "./cadena";
import { consumidorAlertas } from "./consumidor-alertas";
import { consumidorAvisoCorreccion, consumidorComprobante } from "./consumidores";
import { consumidorDias, trabajoRecalcularDias } from "./dias";
import { diasListar, diasResumenPeriodo } from "./dias-capacidades";
import { diasRecalcular, jornadasFijarTipo } from "./dias-gestion";
import { hoyListar } from "./dias-hoy";
import { consumidorAvisoContingencia } from "./consumidor-contingencia";
import { contingenciasListar, contingenciasRegistrar, contingenciasResponder } from "./contingencias";
import { correccionesVerEnlace, correccionesResponderEnlace } from "./correcciones-enlace";
import { correccionesListar } from "./correcciones-listar";
import { correccionesProponer } from "./correcciones-proponer";
import { correccionesResponder } from "./correcciones-responder";
import { trabajoVencerCorrecciones } from "./correcciones-trabajo";
import { biometriaEnrolar, biometriaEnrolarRrhh } from "./biometria-enrolar";
import { biometriaDarDeBaja, biometriaEstado, biometriaMiEstado } from "./biometria-gestion";
import { trabajoSuprimirBiometria } from "./biometria-trabajo";
import { biometriaIniciarVida } from "./biometria-vida";
import { consentimientosAceptar, consentimientosRegistrar, consentimientosRevocar } from "./consentimientos";
import { telefonoHabilitar } from "./telefono";
import { incidentesCerrar, incidentesListar, incidentesRegistrar } from "./incidentes";
import { marcasObtener, marcasListar } from "./lecturas";
import { marcasRegistrar } from "./registrar";
import { marcasVerificar } from "./verificar";

export { ajustesAsistencia } from "./ajustes";
export { fijarVerificadorIdentidad, PIN_SIMULADO } from "./identidad-registro";
export const trabajosAsistencia = [trabajoVerificarCadenaMarcas, trabajoVencerCorrecciones, trabajoAlertasArt45, trabajoAvisoCompensables, trabajoRecalcularDias, trabajoSuprimirBiometria];
export const consumidoresAsistencia = [consumidorComprobante, consumidorAvisoCorreccion, consumidorAvisoContingencia, consumidorDias, consumidorAlertas];
export const capacidades = [
  marcasRegistrar, marcasListar, marcasObtener, marcasVerificar,
  correccionesProponer, correccionesListar, correccionesResponder, correccionesVerEnlace, correccionesResponderEnlace,
  contingenciasRegistrar, contingenciasListar, contingenciasResponder,
  incidentesRegistrar, incidentesCerrar, incidentesListar,
  biometriaIniciarVida, biometriaEnrolar, biometriaEnrolarRrhh, biometriaDarDeBaja, biometriaEstado, biometriaMiEstado,
  consentimientosAceptar, consentimientosRegistrar, consentimientosRevocar, telefonoHabilitar,
  diasListar, diasResumenPeriodo, diasRecalcular, jornadasFijarTipo, hoyListar,
];

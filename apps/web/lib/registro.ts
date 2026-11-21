import {
  capacidadesDelNucleo,
  consumidorAvisoPrueba,
  consumidorAvisoPruebaEmpresa,
  consumidorSeguimientoCierre,
  consumidoresDelNucleo,
  limpiarConsumidores,
  limpiarModulos,
  limpiarRegistro,
  limpiarTrabajos,
  registrarCapacidades,
  registrarConsumidores,
  registrarModulos,
  registrarTrabajos,
  trabajoCierreAutomatico,
  trabajoCobrosMesAnterior,
  trabajoCobrosPruebas,
  trabajoPruebasGratis,
  trabajoVigilanciaRondas,
  trabajosComercial,
  trabajosDesempeno,
  consumidoresDesempeno,
  consumidorPautaCambio,
  consumidorPautaPublicada,
  trabajosDelNucleo,
  trabajosFinanzas,
  trabajoReportesAcceso,
  trabajoRetencionAcceso,
} from "@opai/capabilities";
import { consumidoresAsistencia, consumidoresCentral, consumidorCpqBandeja, consumidorCpqEnlace, consumidorRendicionesAvisos, consumidorTicketsAvisos, modulos, trabajosAgente, trabajosAsistencia, trabajosCentral, trabajosCpq } from "@opai/modules";

let hecho = false;

/**
 * Construye los registros del proceso: capacidades (núcleo + módulos), trabajos y consumidores de
 * eventos. Se ejecuta una vez por proceso; si Next recarga este archivo en desarrollo, se
 * reconstruye desde cero.
 */
export function asegurarRegistro(): void {
  if (hecho) return;
  limpiarRegistro();
  limpiarModulos();
  limpiarTrabajos();
  limpiarConsumidores();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos(modulos);
  registrarTrabajos([
    ...trabajosDelNucleo,
    ...trabajosFinanzas,
    ...trabajosComercial,
    ...trabajosDesempeno,
    ...trabajosAgente,
    ...trabajosAsistencia,
    ...trabajosCpq,
    ...trabajosCentral,
    trabajoCierreAutomatico,
    trabajoReportesAcceso,
    trabajoRetencionAcceso,
    trabajoCobrosMesAnterior,
    trabajoCobrosPruebas,
    trabajoVigilanciaRondas,
  trabajoPruebasGratis,
  ]);
  registrarConsumidores([
    ...consumidoresDelNucleo,
    ...consumidoresAsistencia,
    ...consumidoresDesempeno,
    ...consumidoresCentral,
    consumidorPautaCambio,
    consumidorPautaPublicada,
    consumidorCpqBandeja,
    consumidorCpqEnlace,
    consumidorTicketsAvisos,
    consumidorRendicionesAvisos,
    consumidorSeguimientoCierre,
    consumidorAvisoPrueba,
    consumidorAvisoPruebaEmpresa,
  ]);
  hecho = true;
}

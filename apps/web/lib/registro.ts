import {
  capacidadesDelNucleo,
  consumidoresDelNucleo,
  limpiarConsumidores,
  limpiarModulos,
  limpiarRegistro,
  limpiarTrabajos,
  registrarCapacidades,
  registrarConsumidores,
  registrarModulos,
  registrarTrabajos,
  trabajosDelNucleo,
  trabajosFinanzas,
} from "@opai/capabilities";
import { consumidorCpqBandeja, modulos } from "@opai/modules";

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
  registrarTrabajos([...trabajosDelNucleo, ...trabajosFinanzas]);
  registrarConsumidores([...consumidoresDelNucleo, consumidorCpqBandeja]);
  hecho = true;
}

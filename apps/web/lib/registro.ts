import {
  capacidadesDelNucleo,
  limpiarModulos,
  limpiarRegistro,
  registrarCapacidades,
  registrarModulos,
} from "@opai/capabilities";
import { modulos } from "@opai/modules";

let hecho = false;

/**
 * Construye el registro de capacidades: núcleo + módulos de `@opai/modules`.
 * Se ejecuta una vez por proceso; si Next recarga este archivo en desarrollo, se reconstruye desde cero.
 */
export function asegurarRegistro(): void {
  if (hecho) return;
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos(modulos);
  hecho = true;
}

// Historial de correos del cliente (CAR-233).
import type { Capacidad } from "../../types";
import { correosCrearDireccion, correosDireccion } from "./buzon";
import { correosHistorial } from "./historial";
import { correosRecibir } from "./recibir";
import { correosAsociar, correosSinAsignar } from "./sin-asignar";

export const capacidadesCorreos: readonly Capacidad[] = [
  correosHistorial,
  correosSinAsignar,
  correosAsociar,
  correosDireccion,
  correosCrearDireccion,
  correosRecibir,
];

export { asegurarBuzon, direccionDelBuzon } from "./comun";
export { registrarSaliente, type Saliente } from "./registrar";

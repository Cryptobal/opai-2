import { trabajoConsultarContribuyenteSii, trabajoPurgarCacheSii } from "./cuentas-sii-trabajo";
import { trabajoPersonasNoRecontratarVencer } from "./personas-no-recontratar-limpieza";
import { trabajoCortarAccesosProgramado } from "./vinculos-corte-programado";

/** Trabajos diarios de los maestros, registrados por el borde (`apps/web/lib/registro.ts`). */
export const trabajosMaestros = [
  trabajoPersonasNoRecontratarVencer,
  trabajoConsultarContribuyenteSii,
  trabajoPurgarCacheSii,
  trabajoCortarAccesosProgramado,
];
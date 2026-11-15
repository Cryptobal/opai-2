import { defineCapability } from "../define";
import { escribirAusencia, salidaAusencia } from "./ausencias-escribir";
import { ausenciaPersonaInput } from "./ausencias-plan";
import { PERMISO_WRITE } from "./comun";

/**
 * Registra un permiso, licencia, vacaciones o ausencia desde la ficha de la persona (ADR-094, adenda CAR-311 d): los
 * turnos que tiene como titular en esas fechas quedan como excepción en la pauta mensual y diaria, con el motivo, y
 * el ausentismo de Desempeño cuenta como justificados los de licencia, vacaciones y permiso (no la ausencia).
 */
export const ausenciasRegistrar = defineCapability({
  id: "pauta.ausencias.registrar",
  descripcion:
    "Registra un permiso, licencia, vacaciones o ausencia de una persona para un día o un rango: cada turno que tiene como titular en la pauta en esas fechas queda como excepción con ese motivo (puesto por cubrir), en todos sus puestos. Es lo que se ingresa desde la ficha del guardia; se anula sin borrar el historial.",
  permiso: PERMISO_WRITE,
  input: ausenciaPersonaInput,
  output: salidaAusencia,
  efecto: "escritura",
  // El motivo es texto libre y puede ser de salud: no llega en claro a la auditoría (CAR-393).
  sensibles: ["motivo"],
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    return escribirAusencia(ctx, input, { dryRun, conPauta: true, exigirTurnos: true });
  },
});

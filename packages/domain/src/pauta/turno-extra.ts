/** Resolución del monto sugerido de un turno extra (CAR-96): puesto → instalación → sin tarifa. */

export type TipoTrabajadorExtra = "propio" | "externo";
export type EstadoTurnoExtra = "por_aprobar" | "aprobado" | "rechazado";
export type OrigenMontoExtra = "puesto" | "instalacion" | "manual" | "sin_tarifa";

export type TarifasTurnoExtra = {
  montoPuesto: number | null;
  montoInstalacion: number | null;
};

export type MontoSugerido = {
  montoClp: number;
  origen: OrigenMontoExtra;
  /** Obligatorio cuando el monto queda en 0 por falta de tarifa. */
  motivoPorDefecto: string | null;
};

/** Elige el monto sugerido: tarifa del puesto, si no la de la instalación, si no 0. */
export function resolverMontoSugerido(t: TarifasTurnoExtra): MontoSugerido {
  if (t.montoPuesto != null && t.montoPuesto >= 0) {
    return { montoClp: t.montoPuesto, origen: "puesto", motivoPorDefecto: null };
  }
  if (t.montoInstalacion != null && t.montoInstalacion >= 0) {
    return { montoClp: t.montoInstalacion, origen: "instalacion", motivoPorDefecto: null };
  }
  return {
    montoClp: 0,
    origen: "sin_tarifa",
    motivoPorDefecto: "Sin tarifa configurada",
  };
}

export type MontoAlAprobar =
  | { ok: true; montoClp: number; montoMotivo: string | null; origen: OrigenMontoExtra | null }
  | { ok: false; error: string };

/** Quien aprueba puede cambiar el monto; el motivo es obligatorio si difiere del sugerido. */
export function validarMontoAlAprobar(args: {
  montoActual: number;
  montoNuevo: number | undefined;
  motivo: string | undefined;
}): MontoAlAprobar {
  if (args.montoNuevo == null || args.montoNuevo === args.montoActual) {
    return { ok: true, montoClp: args.montoActual, montoMotivo: null, origen: null };
  }
  const motivo = args.motivo?.trim() ?? "";
  if (motivo.length < 3) {
    return { ok: false, error: "Al cambiar el monto debes indicar un motivo de al menos 3 caracteres." };
  }
  if (args.montoNuevo < 0) return { ok: false, error: "El monto no puede ser negativo." };
  return { ok: true, montoClp: args.montoNuevo, montoMotivo: motivo, origen: "manual" };
}

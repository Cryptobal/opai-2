/**
 * Reglas de envío conjunto (CAR-144). Punto único para ajustes de Carlos:
 * congelamiento, autoaprobación owner y cuatro ojos fuera de márgenes.
 */

export type EvaluacionAprobacionEnvioPropuesta = {
  puedeDecidir: boolean;
  autoaprobacion: boolean;
  motivoNoDecidir: string | null;
};

/** La propuesta se congela al aprobar o enviar, no al solicitar, y solo si va en el paquete. */
export function debeCongelarPropuestaEnEnvio(incluyePropuesta: boolean): boolean {
  return incluyePropuesta;
}

/** Dentro de márgenes: el owner puede autoaprobar su propio envío (auditado en servidor). */
export function ownerPuedeAutoaprobarEnvioPropio(): boolean {
  return true;
}

/**
 * Fuera de márgenes (requiereAprobacion / N6): por defecto quien solicitó no aprueba;
 * Carlos puede habilitar que sí lo haga cambiando solo esta bandera.
 */
export function solicitantePuedeAprobarEnvioFueraMargen(): boolean {
  return false;
}

const MSG_SOLO_OWNER_ADMIN = "Solo un owner o un admin puede aprobar envíos.";
const MSG_PROPIA_FUERA_MARGEN =
  "Fuera de márgenes, quien solicitó el envío no puede aprobarlo; pide revisión a otro aprobador.";
const MSG_PROPIA_DENTRO_MARGEN =
  "No puedes aprobar un envío que solicitaste tú; pide revisión a otro aprobador o al owner.";

/**
 * Política de aprobación de envíos (permiso `cpq:envios.aprobar`).
 * `fueraDeMargenes` = la versión tuvo aprobación de margen (N6) antes del envío.
 */
export function evaluarAprobacionEnvioPropuesta(input: {
  actorTipo: string;
  actorId: string;
  rol: string | null;
  autorizaEnviosAprobar: boolean;
  solicitadoPorId: string;
  fueraDeMargenes: boolean;
}): EvaluacionAprobacionEnvioPropuesta {
  if (input.actorTipo === "agent") {
    return { puedeDecidir: false, autoaprobacion: false, motivoNoDecidir: null };
  }
  if (!input.autorizaEnviosAprobar) {
    return { puedeDecidir: false, autoaprobacion: false, motivoNoDecidir: null };
  }
  if (input.rol !== "owner" && input.rol !== "admin") {
    return { puedeDecidir: false, autoaprobacion: false, motivoNoDecidir: MSG_SOLO_OWNER_ADMIN };
  }
  const propia = input.actorId === input.solicitadoPorId;
  if (!propia) {
    return { puedeDecidir: true, autoaprobacion: false, motivoNoDecidir: null };
  }
  if (input.fueraDeMargenes) {
    if (solicitantePuedeAprobarEnvioFueraMargen()) {
      return { puedeDecidir: true, autoaprobacion: true, motivoNoDecidir: null };
    }
    return {
      puedeDecidir: false,
      autoaprobacion: false,
      motivoNoDecidir: MSG_PROPIA_FUERA_MARGEN,
    };
  }
  if (input.rol === "owner" && ownerPuedeAutoaprobarEnvioPropio()) {
    return { puedeDecidir: true, autoaprobacion: true, motivoNoDecidir: null };
  }
  return {
    puedeDecidir: false,
    autoaprobacion: false,
    motivoNoDecidir: MSG_PROPIA_DENTRO_MARGEN,
  };
}

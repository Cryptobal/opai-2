/**
 * Reglas de envío conjunto (CAR-144). Punto único (decisión Carlos, nov-2026):
 * dentro de márgenes → envío directo al solicitar; fuera → pendiente salvo owner/admin.
 */

export type EvaluacionAprobacionEnvioPropuesta = {
  puedeDecidir: boolean;
  autoaprobacion: boolean;
  motivoNoDecidir: string | null;
};

/** La propuesta se congela al enviar, no al solicitar pendiente, y solo si va en el paquete. */
export function debeCongelarPropuestaEnEnvio(incluyePropuesta: boolean): boolean {
  return incluyePropuesta;
}

const MSG_PROPIA_FUERA_MARGEN =
  "Fuera de márgenes, quien solicitó el envío no puede aprobarlo; pide revisión a otro aprobador.";
const MSG_SIN_PERMISO = "Se requiere el permiso Aprobar envíos.";

/**
 * Fuera de márgenes del envío conjunto: la cotización pasó por aprobación de margen (N6).
 * Dentro = pasa gates R-CPQ-034 sin esa excepción.
 */
export function fueraDeMargenesEnvioConjunto(aprobacionMargenAprobada: boolean): boolean {
  return aprobacionMargenAprobada;
}

/** Si el envío debe quedar pendiente de aprobación ajena al solicitar. */
export function debeQuedarPendienteAprobacionEnvio(
  fueraDeMargenes: boolean,
  rol: string | null,
): boolean {
  if (!fueraDeMargenes) return false;
  if (rol === "owner" || rol === "admin") return false;
  return true;
}

/** Owner/admin envían en el acto aunque esté fuera de márgenes (auditado). */
export function rolPuedeEnviarFueraDeMargenes(rol: string | null): boolean {
  return rol === "owner" || rol === "admin";
}

/**
 * Quién puede aprobar un envío ya pendiente (solo fuera de márgenes).
 * Owner/admin siempre; otro usuario con permiso, nunca quien solicitó.
 */
export function evaluarAprobacionEnvioPropuesta(input: {
  actorTipo: string;
  actorId: string;
  rol: string | null;
  autorizaEnviosAprobar: boolean;
  solicitadoPorId: string;
}): EvaluacionAprobacionEnvioPropuesta {
  if (input.actorTipo === "agent") {
    return { puedeDecidir: false, autoaprobacion: false, motivoNoDecidir: null };
  }
  if (!input.autorizaEnviosAprobar) {
    return { puedeDecidir: false, autoaprobacion: false, motivoNoDecidir: MSG_SIN_PERMISO };
  }
  const propia = input.actorId === input.solicitadoPorId;
  if (rolPuedeEnviarFueraDeMargenes(input.rol)) {
    return { puedeDecidir: true, autoaprobacion: propia, motivoNoDecidir: null };
  }
  if (propia) {
    return {
      puedeDecidir: false,
      autoaprobacion: false,
      motivoNoDecidir: MSG_PROPIA_FUERA_MARGEN,
    };
  }
  return { puedeDecidir: true, autoaprobacion: false, motivoNoDecidir: null };
}

/** Flag de auditoría al cerrar un envío fuera de márgenes por owner/admin (incl. propio). */
export function autoaprobacionPrivilegioEnvio(input: {
  fueraDeMargenes: boolean;
  rol: string | null;
  actorId: string;
  solicitadoPorId: string;
}): boolean {
  if (!input.fueraDeMargenes) return false;
  if (!rolPuedeEnviarFueraDeMargenes(input.rol)) return false;
  return input.actorId === input.solicitadoPorId;
}

import { mfaEsObligatoria, pendienteMfa, type EstadoMfa } from "@opai/domain";

import type { Identidad } from "./actor";

/**
 * Desde CAR-286 (11-nov-2026) el segundo factor solo es obligatorio para las cuentas de plataforma;
 * owner, admin y la empresa ya no lo exigen (el ajuste `core.seguridad_mfa_obligatorio_admins` se
 * retiró). Se mantiene async para no cambiar a quienes la invocan.
 */
export async function mfaObligatoriaPara(identidad: Identidad): Promise<boolean> {
  return mfaEsObligatoria(identidad.usuario.platformRole);
}

export async function estadoMfaDe(identidad: Identidad): Promise<EstadoMfa> {
  return {
    activa: identidad.mfaActiva,
    verificada: identidad.mfaVerificada === true,
    obligatoria: await mfaObligatoriaPara(identidad),
  };
}

/** Único punto de verificación para API con cookie, Server Actions y páginas. */
export async function verificarMfaDe(identidad: Identidad) {
  return pendienteMfa(await estadoMfaDe(identidad));
}

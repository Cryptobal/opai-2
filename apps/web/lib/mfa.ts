import { ajuste } from "@opai/capabilities";
import { mfaEsObligatoria, pendienteMfa, type EstadoMfa } from "@opai/domain";

import { contextoDeIdentidad, type Identidad } from "./actor";

/** El tenant solo puede agregar exigencia: plataforma/owner/admin nunca pueden excluirse. */
export async function mfaObligatoriaPara(identidad: Identidad): Promise<boolean> {
  if (mfaEsObligatoria(identidad.usuario.platformRole, identidad.actual?.rol)) return true;
  if (!identidad.actual) return false;
  return ajuste<boolean>(
    contextoDeIdentidad(identidad, null),
    "core",
    "seguridad_mfa_obligatorio_admins",
  );
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

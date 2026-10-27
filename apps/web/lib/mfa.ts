import { ajuste } from "@opai/capabilities";
import { mfaEsObligatoria, pendienteMfa, type EstadoMfa } from "@opai/domain";

import type { Identidad } from "./actor";

/**
 * El tenant solo puede agregar exigencia: plataforma/owner/admin nunca pueden excluirse.
 *
 * El import de `./actor` es diferido (dinámico): ese módulo carga `@opai/auth`, que al importarse
 * construye `betterAuth(...)` y necesita `DATABASE_URL`. Páginas y pruebas que solo importan
 * `lib/mfa` para el caso rápido (plataforma/owner/admin, que no llega a este `import()`) no deberían
 * arrastrar esa dependencia solo por la forma estática del grafo de módulos (CI, review 5662337649).
 */
export async function mfaObligatoriaPara(identidad: Identidad): Promise<boolean> {
  if (mfaEsObligatoria(identidad.usuario.platformRole, identidad.actual?.rol)) return true;
  if (!identidad.actual) return false;
  const { contextoDeIdentidad } = await import("./actor");
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

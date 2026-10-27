import { ajuste } from "@opai/capabilities";

import { contextoDeIdentidad, type Identidad } from "./actor";

/**
 * Política de segundo factor (NÚCLEO-F). Decisión de Carlos (26-oct-2026, chat con OPAI 2.0): el
 * segundo factor es obligatorio para las cuentas de plataforma y para el owner y el admin de cada
 * tenant; los demás roles lo activan de forma opcional. Para el tenant la exigencia es parametrizada
 * por el ajuste `core.seguridad_mfa_obligatorio_admins` (por defecto obligatorio); las cuentas de
 * plataforma lo exigen siempre, sin ajuste.
 */
const ROLES_PRIVILEGIADOS = new Set(["owner", "admin"]);

/**
 * ¿La cuenta del request debe tener el segundo factor activo? Plataforma: siempre. Tenant: solo owner
 * y admin, y según el ajuste del tenant. La lectura del ajuste ocurre solo para owner/admin que aún no
 * tienen el segundo factor (la verificación en {@link requerirSegundoFactor} corta antes si ya lo tienen),
 * por lo que no agrega consultas a la navegación común (ADR-045). El rol se toma del rol base de la
 * membresía del tenant actual (owner/admin), nunca de la UI (ADR-022).
 */
export async function mfaObligatoriaPara(identidad: Identidad): Promise<boolean> {
  if (identidad.usuario.platformRole) return true;
  const rol = identidad.actual?.rol;
  if (!identidad.actual || !rol || !ROLES_PRIVILEGIADOS.has(rol)) return false;
  const ctx = contextoDeIdentidad(identidad, "erp");
  return ajuste<boolean>(ctx, "core", "seguridad_mfa_obligatorio_admins");
}

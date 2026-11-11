import { clienteAuth, conRolAuth } from "./identidad";
import { registrarEventoSeguridad } from "./eventos-seguridad";
import { exigirSinLockAuditoria } from "./lock-auditoria";
import type { TenantTx } from "./transaccion";

/**
 * Métodos de autenticación PROPIOS de un usuario (CAR-286): passkeys y app autenticadora (TOTP).
 * Solo metadatos: nunca la clave pública, el id de credencial, el secreto TOTP ni los códigos. Las
 * escrituras corren en la transacción de la capacidad (con su auditoría de empresa) y dejan además el
 * hecho en la cadena `seguridad` de la auditoría global, atómico con el cambio.
 */
export type PasskeyVista = {
  id: string;
  nombre: string | null;
  creadaEn: Date | null;
  /** Sincronizada entre dispositivos (iCloud, Google…) o atada a un solo dispositivo/llave. */
  sincronizada: boolean;
};

export type MetodosUsuario = { totp: boolean; passkeys: PasskeyVista[]; tienePassword: boolean };

/** Origen del cambio para el rastro de seguridad: empresa desde la que se hizo y vía. */
export type OrigenCambio = { tenantId: string | null; via: "persona" | "agente" };

/** Prefijo de la marca de reautenticación (`core.verifications`), que escribe `@opai/auth`. */
export const PREFIJO_REAUTENTICACION = "opai-reauth:";

export async function metodosDeUsuario(userId: string): Promise<MetodosUsuario> {
  exigirSinLockAuditoria("Leer los métodos de autenticación");
  return clienteAuth().$transaction(async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    const filas = await tx.passkey.findMany({
      where: { userId },
      select: { id: true, name: true, createdAt: true, backedUp: true },
      orderBy: { createdAt: "asc" },
    });
    const password = await tx.account.count({
      where: { userId, providerId: "credential", password: { not: null } },
    });
    return {
      totp: u?.twoFactorEnabled === true,
      passkeys: filas.map((p) => ({
        id: p.id,
        nombre: p.name,
        creadaEn: p.createdAt,
        sincronizada: p.backedUp,
      })),
      tienePassword: password > 0,
    };
  });
}

async function rastro(tx: TenantTx, tipo: `seguridad.${string}`, userId: string, o: OrigenCambio) {
  await registrarEventoSeguridad(
    {
      tipo,
      userId,
      tenantId: o.tenantId,
      detalle: { resultado: "ok", via: o.via },
      ipHmac: null,
      userAgent: null,
    },
    tx,
  );
}

/** Renombra una passkey propia. Devuelve false si no existe o no es del usuario. */
export async function renombrarPasskey(
  tx: TenantTx,
  userId: string,
  id: string,
  nombre: string,
  o: OrigenCambio,
): Promise<boolean> {
  const n = await conRolAuth(
    tx,
    () => tx.$executeRaw`
      UPDATE core.passkeys SET name = ${nombre} WHERE id = ${id}::uuid AND user_id = ${userId}::uuid`,
  );
  if (n === 1) await rastro(tx, "seguridad.passkey.renombrada", userId, o);
  return n === 1;
}

/** Quita una passkey propia (el trigger recalcula `users.passkey_enabled`). */
export async function quitarPasskey(
  tx: TenantTx,
  userId: string,
  id: string,
  o: OrigenCambio,
): Promise<boolean> {
  const n = await conRolAuth(
    tx,
    () => tx.$executeRaw`
      DELETE FROM core.passkeys WHERE id = ${id}::uuid AND user_id = ${userId}::uuid`,
  );
  if (n === 1) await rastro(tx, "seguridad.passkey.baja", userId, o);
  return n === 1;
}

/** Desactiva la app autenticadora propia: borra el secreto y los códigos de respaldo. */
export async function desactivarTotp(tx: TenantTx, userId: string, o: OrigenCambio) {
  const n = await conRolAuth(tx, async () => {
    await tx.$executeRaw`DELETE FROM core.two_factor WHERE user_id = ${userId}::uuid`;
    return tx.$executeRaw`
      UPDATE core.users SET two_factor_enabled = false, updated_at = now()
       WHERE id = ${userId}::uuid AND two_factor_enabled`;
  });
  if (n === 1) await rastro(tx, "seguridad.mfa.desactivacion", userId, o);
  return n === 1;
}

/**
 * Consume la marca de reautenticación reciente del usuario (contraseña, código o passkey confirmados
 * hace menos de 5 minutos por `@opai/auth`). Un solo uso: la borra.
 */
export async function consumirReautenticacion(tx: TenantTx, userId: string): Promise<boolean> {
  const n = await conRolAuth(
    tx,
    () => tx.$executeRaw`
      DELETE FROM core.verifications
       WHERE identifier = ${PREFIJO_REAUTENTICACION + userId} AND expires_at > now()`,
  );
  return n > 0;
}

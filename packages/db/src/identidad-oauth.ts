import { conRolAuth, clienteAuth } from "./identidad";
import { registrarEventoSeguridad } from "./eventos-seguridad";
import type { OrigenCambio } from "./identidad-metodos";
import { exigirSinLockAuditoria } from "./lock-auditoria";
import type { TenantTx } from "./transaccion";

/**
 * Apps conectadas por OAuth (CAR-247): una por consentimiento de la persona en una empresa. Solo
 * metadatos: nunca tokens ni hashes. El último uso es la emisión más reciente de un acceso.
 */
export type AppConectada = {
  clientId: string;
  nombre: string | null;
  sitio: string | null;
  alcances: string[];
  conectadaEn: Date;
  ultimoUso: Date | null;
};

export async function appsConectadas(userId: string, tenantId: string): Promise<AppConectada[]> {
  exigirSinLockAuditoria("Leer las apps conectadas");
  return clienteAuth().$transaction(async (tx) => {
    const consentimientos = await tx.oauthConsent.findMany({
      where: {
        userId,
        referenceId: tenantId,
        client: { OR: [{ disabled: false }, { disabled: null }] },
      },
      select: {
        clientId: true,
        scopes: true,
        createdAt: true,
        client: { select: { name: true, uri: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const usos = await tx.oauthAccessToken.groupBy({
      by: ["clientId"],
      where: { userId, referenceId: tenantId },
      _max: { createdAt: true },
    });
    const uso = new Map(usos.map((u) => [u.clientId, u._max.createdAt]));
    return consentimientos.map((c) => ({
      clientId: c.clientId,
      nombre: c.client.name,
      sitio: c.client.uri,
      alcances: c.scopes,
      conectadaEn: c.createdAt,
      ultimoUso: uso.get(c.clientId) ?? null,
    }));
  });
}

/**
 * Desconecta una app de la persona en una empresa: revoca sus accesos, borra sus renovaciones y el
 * consentimiento, en la transacción del llamador. Devuelve false si no había nada que desconectar.
 */
export async function desconectarApp(
  tx: TenantTx,
  userId: string,
  tenantId: string,
  clientId: string,
  o: OrigenCambio,
): Promise<boolean> {
  const n = await conRolAuth(tx, async () => {
    const tokens =
      (await tx.$executeRaw`
        UPDATE core.oauth_access_tokens SET revoked = now()
         WHERE client_id = ${clientId} AND user_id = ${userId}::uuid
           AND reference_id = ${tenantId} AND revoked IS NULL`) +
      // Las renovaciones se borran (no se marcan): una renovación marcada que la app vuelva a usar
      // haría que el proveedor corte la familia completa de la app, también en otras empresas.
      (await tx.$executeRaw`
        DELETE FROM core.oauth_refresh_tokens
         WHERE client_id = ${clientId} AND user_id = ${userId}::uuid
           AND reference_id = ${tenantId}`);
    const consentimientos = await tx.$executeRaw`
      DELETE FROM core.oauth_consents
       WHERE client_id = ${clientId} AND user_id = ${userId}::uuid AND reference_id = ${tenantId}`;
    return tokens + consentimientos;
  });
  if (n === 0) return false;
  await registrarEventoSeguridad(
    {
      tipo: "seguridad.oauth.desconexion",
      userId,
      tenantId: o.tenantId,
      detalle: { resultado: "ok", via: o.via },
      ipHmac: null,
      userAgent: null,
    },
    tx,
  );
  return true;
}

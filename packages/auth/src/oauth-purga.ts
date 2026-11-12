import { clienteAuth } from "@opai/db";

const DIA = 24 * 60 * 60 * 1000;

/**
 * Purga diaria del OAuth del MCP (CAR-247): accesos y renovaciones vencidos o revocados hace más de un
 * día (ya no sirven; un día de margen conserva la detección de reuso de una renovación rotada) y apps
 * registradas hace más de 30 días que nunca se conectaron (sin consentimiento ni accesos). La llama el
 * cron diario; best-effort.
 */
export async function purgarOAuth(ahora = new Date()): Promise<number> {
  const corte = new Date(ahora.getTime() - DIA);
  const muertos = { OR: [{ expiresAt: { lt: corte } }, { revoked: { lt: corte } }] };
  const db = clienteAuth();
  const accesos = await db.oauthAccessToken.deleteMany({ where: muertos });
  const renovaciones = await db.oauthRefreshToken.deleteMany({ where: muertos });
  const apps = await db.oauthClient.deleteMany({
    where: {
      createdAt: { lt: new Date(ahora.getTime() - 30 * DIA) },
      consents: { none: {} },
      accessTokens: { none: {} },
      refreshTokens: { none: {} },
    },
  });
  return accesos.count + renovaciones.count + apps.count;
}

import { clienteAuth } from "@opai/db";

const DIA = 24 * 60 * 60 * 1000;

/**
 * Purga diaria del OAuth del MCP (CAR-247): accesos vencidos o revocados hace más de un día,
 * renovaciones vencidas hace más de un día (las rotadas se guardan hasta vencer) y apps
 * registradas hace más de 30 días que nunca se conectaron (sin consentimiento ni accesos). La llama el
 * cron diario; best-effort.
 */
export async function purgarOAuth(ahora = new Date()): Promise<number> {
  const corte = new Date(ahora.getTime() - DIA);
  const db = clienteAuth();
  const accesos = await db.oauthAccessToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: corte } }, { revoked: { lt: corte } }] },
  });
  // Una renovación rotada se conserva hasta su vencimiento: si alguien la presenta otra vez, el
  // proveedor la reconoce como reuso y corta toda la familia (posible robo).
  const renovaciones = await db.oauthRefreshToken.deleteMany({
    where: { expiresAt: { lt: corte } },
  });
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

// CAR-247 PR 2: la purga diaria borra accesos y renovaciones vencidos o revocados hace más de un día
// y las apps registradas hace más de 30 días que nunca se conectaron. No toca lo vigente.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type { purgarOAuth as Purgar } from "../src/oauth-purga";

const DIA = 86_400_000;

describe.skipIf(!urlPropietario)("purga del OAuth del MCP (CAR-247)", () => {
  let e: Entorno;
  let purgarOAuth: typeof Purgar;
  let userId = "";
  const sufijo = randomUUID().slice(0, 8);
  const usada = `usada-${sufijo}`;
  const vieja = `vieja-${sufijo}`;
  const nueva = `nueva-${sufijo}`;

  const cliente = (clientId: string, creada: Date) =>
    e.admin.oauthClient.create({
      data: {
        clientId,
        name: clientId,
        createdAt: creada,
        scopes: [],
        contacts: [],
        redirectUris: ["https://app.invalid/cb"],
        postLogoutRedirectUris: [],
        grantTypes: ["authorization_code"],
        responseTypes: ["code"],
      },
    });
  const acceso = (vence: number, revocado: Date | null = null) =>
    e.admin.oauthAccessToken.create({
      data: {
        token: `t-${randomUUID()}`,
        clientId: usada,
        userId,
        referenceId: randomUUID(),
        resources: [],
        requestedUserInfoClaims: [],
        scopes: [],
        expiresAt: new Date(Date.now() + vence),
        createdAt: new Date(),
        revoked: revocado,
      },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    ({ purgarOAuth } = await import("../src/oauth-purga"));
    userId = (
      await e.admin.user.create({ data: { name: "P", email: `purga-${sufijo}@test.opai.cl` } })
    ).id;
    const hace40 = new Date(Date.now() - 40 * DIA);
    await cliente(usada, hace40);
    await cliente(vieja, hace40);
    await cliente(nueva, new Date());
  }, 120_000);

  afterAll(async () => {
    await e.admin.oauthClient.deleteMany({ where: { clientId: { endsWith: sufijo } } });
    await e.admin.user.delete({ where: { id: userId } });
    await e.cerrar();
  });

  it("borra lo vencido o revocado y las apps viejas sin uso; conserva lo vigente", async () => {
    const vigente = await acceso(3_600_000);
    const vencido = await acceso(-2 * DIA);
    const revocado = await acceso(3_600_000, new Date(Date.now() - 2 * DIA));
    const recienRevocado = await acceso(3_600_000, new Date());
    const rotada = await e.admin.oauthRefreshToken.create({
      data: {
        token: `r-${randomUUID()}`,
        clientId: usada,
        userId,
        referenceId: randomUUID(),
        resources: [],
        requestedUserInfoClaims: [],
        scopes: [],
        expiresAt: new Date(Date.now() + 20 * DIA),
        createdAt: new Date(Date.now() - 5 * DIA),
        revoked: new Date(Date.now() - 4 * DIA),
      },
    });
    await purgarOAuth();
    // Rotada hace 4 días y sin vencer: se conserva para detectar un reuso (robo de la renovación).
    expect(await e.admin.oauthRefreshToken.count({ where: { id: rotada.id } })).toBe(1);
    const quedan = await e.admin.oauthAccessToken.findMany({
      where: { id: { in: [vigente.id, vencido.id, revocado.id, recienRevocado.id] } },
      select: { id: true },
    });
    expect(quedan.map((q) => q.id).sort()).toEqual([vigente.id, recienRevocado.id].sort());
    const apps = await e.admin.oauthClient.findMany({
      where: { clientId: { endsWith: sufijo } },
      select: { clientId: true },
    });
    expect(apps.map((a) => a.clientId).sort()).toEqual([nueva, usada].sort());
  });
});

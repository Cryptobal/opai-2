// CAR-291 (Slack F1, ADR-093), migración 20261124100000: la instalación de Slack queda aislada por
// empresa (RLS), un espacio de Slack se liga a una sola empresa y el resolver SECURITY DEFINER solo
// devuelve el tenant de un team_id exacto.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("instalaciones de Slack: RLS y resolver (CAR-291)", () => {
  let e: Entorno;
  const t = { a: "", b: "" };
  const sufijo = randomUUID().slice(0, 8).toUpperCase().replace(/-/g, "");
  const team = { a: `T0A${sufijo}`, b: `T0B${sufijo}` };
  const fila = (tenantId: string, teamId: string) => ({
    tenantId,
    teamId,
    teamNombre: "Espacio de pruebas",
    botUserId: "U0BOT1",
    appId: "A0APP1",
  });

  beforeAll(async () => {
    e = await prepararEntorno();
    for (const lado of ["a", "b"] as const) {
      const slug = `slk-${lado}-${sufijo.toLowerCase()}`;
      t[lado] = (
        await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "aseo" } })
      ).id;
    }
    await e.forTenant(t.a).slackInstalacion.create({ data: fila(t.a, team.a) });
  });

  afterAll(async () => {
    if (!e) return;
    await e.admin.slackInstalacion.deleteMany({ where: { tenantId: { in: [t.a, t.b] } } });
    await e.admin.tenant.deleteMany({ where: { id: { in: [t.a, t.b] } } });
    await e.cerrar();
  });

  it("cada empresa ve solo su instalación", async () => {
    expect(await e.forTenant(t.a).slackInstalacion.count()).toBe(1);
    expect(await e.forTenant(t.b).slackInstalacion.count()).toBe(0);
    expect(await e.appSinTenant.slackInstalacion.count()).toBe(0);
  });

  it("una empresa no puede escribir una instalación a nombre de otra", async () => {
    await expect(
      e.forTenant(t.b).slackInstalacion.create({ data: fila(t.a, team.b) }),
    ).rejects.toThrow();
  });

  it("un espacio de Slack queda ligado a una sola empresa, aunque la otra no lo vea", async () => {
    await expect(
      e.forTenant(t.b).slackInstalacion.create({ data: fila(t.b, team.a) }),
    ).rejects.toThrow();
  });

  it("una empresa tiene a lo más una instalación", async () => {
    await expect(
      e.forTenant(t.a).slackInstalacion.create({ data: fila(t.a, team.b) }),
    ).rejects.toThrow();
  });

  it("el resolver devuelve solo el tenant de un team_id exacto y nunca con formato raro", async () => {
    const { resolverInstalacionSlack } = await import("../src/slack-instalacion");
    expect(await resolverInstalacionSlack(team.a)).toEqual({ tenantId: t.a });
    expect(await resolverInstalacionSlack(team.b)).toBeNull();
    expect(await resolverInstalacionSlack("T0%")).toBeNull();
    expect(await resolverInstalacionSlack(team.a.toLowerCase())).toBeNull();
    const r = await e.appSinTenant.$queryRaw<{ x: string | null }[]>`
      SELECT "core"."slack_instalacion_resolver"(${"' OR 1=1 --"}) AS x`;
    expect(r[0]?.x).toBeNull();
  });
});

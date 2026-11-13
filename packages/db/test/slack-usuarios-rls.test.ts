// CAR-292 (Slack F2, ADR-093), migración 20261205100000: el vínculo persona ↔ usuario de Slack queda
// aislado por empresa (RLS), solo puede apuntar a un miembro de la misma empresa (FK compuesta) y un
// usuario de Slack se liga a lo más a una persona por empresa.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("vínculos de Slack: RLS y membresía (CAR-292)", () => {
  let e: Entorno;
  const t = { a: "", b: "" };
  const u = { a1: "", a2: "", b1: "" };
  const sufijo = randomUUID().slice(0, 8);
  const vinculo = (tenantId: string, userId: string, slackUserId: string | null) => ({
    tenantId,
    userId,
    estado: slackUserId ? "vinculado" : "sin_vincular",
    slackUserId,
    motivo: slackUserId ? null : "no_encontrado",
    revisadoEn: new Date(),
  });

  beforeAll(async () => {
    e = await prepararEntorno();
    for (const lado of ["a", "b"] as const) {
      const slug = `slku-${lado}-${sufijo}`;
      t[lado] = (
        await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "aseo" } })
      ).id;
    }
    for (const [k, tenant] of [
      ["a1", t.a],
      ["a2", t.a],
      ["b1", t.b],
    ] as const) {
      const user = await e.admin.user.create({
        data: { name: k, email: `${k}-${sufijo}@slack.test` },
      });
      u[k] = user.id;
      await e.admin.membership.create({
        data: { tenantId: tenant, userId: user.id, rol: "admin", portales: ["erp"] },
      });
    }
    await e.forTenant(t.a).slackUsuario.create({ data: vinculo(t.a, u.a1, "U0SLACK1") });
  });

  afterAll(async () => {
    if (!e) return;
    await e.admin.slackUsuario.deleteMany({ where: { tenantId: { in: [t.a, t.b] } } });
    await e.admin.membership.deleteMany({ where: { tenantId: { in: [t.a, t.b] } } });
    await e.admin.user.deleteMany({ where: { id: { in: Object.values(u) } } });
    await e.admin.tenant.deleteMany({ where: { id: { in: [t.a, t.b] } } });
    await e.cerrar();
  });

  it("cada empresa ve solo sus vínculos", async () => {
    expect(await e.forTenant(t.a).slackUsuario.count()).toBe(1);
    expect(await e.forTenant(t.b).slackUsuario.count()).toBe(0);
    expect(await e.appSinTenant.slackUsuario.count()).toBe(0);
  });

  it("no se puede ligar a alguien que no es miembro de la empresa (nunca entre empresas)", async () => {
    await expect(
      e.forTenant(t.a).slackUsuario.create({ data: vinculo(t.a, u.b1, "U0SLACK2") }),
    ).rejects.toThrow();
    await expect(
      e.forTenant(t.b).slackUsuario.create({ data: vinculo(t.a, u.a2, "U0SLACK2") }),
    ).rejects.toThrow();
  });

  it("un usuario de Slack se liga a lo más a una persona por empresa", async () => {
    await expect(
      e.forTenant(t.a).slackUsuario.create({ data: vinculo(t.a, u.a2, "U0SLACK1") }),
    ).rejects.toThrow();
    // «sin_vincular» sin id de Slack sí se puede repetir.
    await e.forTenant(t.a).slackUsuario.create({ data: vinculo(t.a, u.a2, null) });
    // Otra empresa puede ligar el mismo id (es otro espacio u otra persona).
    await e.forTenant(t.b).slackUsuario.create({ data: vinculo(t.b, u.b1, "U0SLACK1") });
  });

  it("el estado y el id de Slack son coherentes", async () => {
    await expect(
      e.forTenant(t.b).slackUsuario.update({
        where: { tenantId_userId: { tenantId: t.b, userId: u.b1 } },
        data: { estado: "sin_vincular" },
      }),
    ).rejects.toThrow();
  });
});

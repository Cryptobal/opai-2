import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { estadoSesionEnTransaccion } from "../src/identidad";
import { enTransaccion } from "../src/transaccion";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("sesión vigente en la conexión del caller", () => {
  let e: Entorno;
  let tenant: string;
  const usuario = randomUUID();
  const token = `token-ficticio-${randomUUID()}`;
  beforeAll(async () => {
    vi.stubEnv("DATABASE_POOL_MAX", "1");
    e = await prepararEntorno();
    await e.admin.user.create({
      data: {
        id: usuario,
        name: "Usuario ficticio",
        email: `${usuario}@prueba.invalid`,
        twoFactorEnabled: true,
        platformRole: "support",
      },
    });
    for (let i = 0; i < 2; i++) {
      const t = await e.admin.tenant.create({
        data: { slug: randomUUID(), nombre: "Empresa ficticia", vertical: "seguridad" },
      });
      tenant = t.id;
      await e.admin.membership.create({ data: { tenantId: t.id, userId: usuario, rol: "viewer" } });
    }
  });
  afterAll(async () => {
    try {
      await e?.cerrar();
    } finally {
      vi.unstubAllEnvs();
    }
  });
  const sesion = (expiresAt = new Date(Date.now() + 60_000)) =>
    e.admin.session.create({
      data: { userId: usuario, token: `${token}-${randomUUID()}`, expiresAt, mfaVerified: true },
    });

  it("pool1: devuelve exclusivamente estado MFA y rol; conserva rol y RLS", async () => {
    const s = await sesion();
    await enTransaccion(tenant, async (tx) => {
      const antes = await tx.$queryRaw<{ rol: string }[]>`SELECT current_user::text AS rol`;
      const estado = await estadoSesionEnTransaccion(tx, s.id, usuario);
      expect(estado).toEqual({ mfaVerificada: true, mfaActiva: true, platformRole: "support" });
      expect(JSON.stringify(estado)).not.toContain(token);
      expect(await tx.$queryRaw`SELECT current_user::text AS rol`).toEqual(antes);
      expect(await tx.membership.findMany({ select: { tenantId: true } })).toEqual([
        { tenantId: tenant },
      ]);
    });
  });

  it.each(["eliminada", "expirada", "usuario ajeno"])("rechaza sesión %s", async (caso) => {
    const s = await sesion(caso === "expirada" ? new Date(0) : undefined);
    if (caso === "eliminada") await e.admin.session.delete({ where: { id: s.id } });
    await enTransaccion(tenant, async (tx) => {
      expect(
        await estadoSesionEnTransaccion(
          tx,
          s.id,
          caso === "usuario ajeno" ? randomUUID() : usuario,
        ),
      ).toBeNull();
      expect(await tx.membership.count()).toBe(1);
    });
  });

  it("clock_timestamp detecta expiración posterior al inicio de la transacción", async () => {
    const s = await sesion();
    await enTransaccion(tenant, async (tx) => {
      // Admin independiente cambia solo la fixture; el helper debe leer el reloj actual de Postgres.
      await e.admin.session.update({
        where: { id: s.id },
        data: { expiresAt: new Date(Date.now() + 1500) },
      });
      expect(await estadoSesionEnTransaccion(tx, s.id, usuario)).not.toBeNull();
      await tx.$queryRaw`SELECT pg_sleep(1.7)::text`;
      expect(await estadoSesionEnTransaccion(tx, s.id, usuario)).toBeNull();
      expect(await tx.membership.count()).toBe(1);
    });
  });

  it("error SQL aborta la lectura; una transacción nueva recupera rol y RLS", async () => {
    await expect(
      enTransaccion(tenant, (tx) => estadoSesionEnTransaccion(tx, "uuid-invalido", usuario)),
    ).rejects.toThrow();
    await enTransaccion(tenant, async (tx) => {
      const [rol] = await tx.$queryRaw<{ rol: string }[]>`SELECT current_user::text AS rol`;
      expect(rol?.rol).not.toBe("opai_auth");
      expect(await tx.membership.findMany({ select: { tenantId: true } })).toEqual([
        { tenantId: tenant },
      ]);
      const [privilegio] = await tx.$queryRaw<{ permitido: boolean }[]>`
        SELECT has_table_privilege(current_user, 'core.sessions', 'SELECT') AS permitido`;
      expect(privilegio?.permitido).toBe(false);
    });
  });
});

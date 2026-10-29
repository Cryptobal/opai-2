// CAR-43 / CAR-45 / CAR-54: opai_app ya no lee ni escribe credenciales, no borra usuarios ni
// empresas; Better Auth (`clienteAuth`) y las operaciones con nombre usan el rol `opai_auth`.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type * as Identidad from "../src/identidad";
import type * as Transaccion from "../src/transaccion";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

const DENEGADO = /permission denied|denegado/i;

describe.skipIf(!urlPropietario)("identidad con rol propio (CAR-43)", () => {
  let e: Entorno;
  let db: typeof Identidad;
  let tx: typeof Transaccion;
  const sufijo = randomUUID().slice(0, 8);
  let tenantId = "";
  let conMfa = "";
  let sinEmpresa = "";
  let miembro = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    db = await import("../src/identidad");
    tx = await import("../src/transaccion");
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `idr-${sufijo}`, nombre: "Idr", vertical: "seguridad" },
      })
    ).id;
    const usuario = async (n: string, extra: object = {}) =>
      (
        await e.admin.user.create({
          data: { name: n, email: `${n}-${sufijo}@test.opai.cl`, ...extra },
        })
      ).id;
    conMfa = await usuario("mfa", { twoFactorEnabled: true });
    sinEmpresa = await usuario("suelto");
    miembro = await usuario("miembro");
    await e.admin.membership.create({
      data: { tenantId, userId: miembro, rol: "viewer", portales: ["erp"] },
    });
    await e.admin.twoFactor.create({
      data: { userId: conMfa, secret: "cifrado", backupCodes: "cifrados" },
    });
    for (const userId of [conMfa, conMfa, sinEmpresa])
      await e.admin.session.create({
        data: { userId, token: randomUUID(), expiresAt: new Date(Date.now() + 3_600_000) },
      });
  });

  afterAll(async () => {
    if (!e) return;
    const ids = { in: [conMfa, sinEmpresa, miembro] };
    await e.admin.membership.deleteMany({ where: { tenantId } });
    await e.admin.user.deleteMany({ where: { id: ids } });
    await e.admin.tenant.delete({ where: { id: tenantId } });
    await e.cerrar();
  });

  it("opai_app no lee ni escribe sesiones, cuentas, verificaciones ni segundo factor", async () => {
    const app = e.appSinTenant;
    await expect(app.session.findMany()).rejects.toThrow(DENEGADO);
    await expect(app.account.findMany()).rejects.toThrow(DENEGADO);
    await expect(app.verification.findMany()).rejects.toThrow(DENEGADO);
    await expect(app.twoFactor.findMany()).rejects.toThrow(DENEGADO);
    await expect(app.session.deleteMany({ where: { userId: conMfa } })).rejects.toThrow(DENEGADO);
  });

  it("opai_app lee users y solo cambia platform_role; no crea ni borra usuarios ni empresas", async () => {
    const app = e.appSinTenant;
    expect(await app.user.findUnique({ where: { id: miembro } })).not.toBeNull();
    await app.user.update({ where: { id: sinEmpresa }, data: { platformRole: null } });
    await expect(
      app.user.update({ where: { id: sinEmpresa }, data: { name: "otro" } }),
    ).rejects.toThrow(DENEGADO);
    await expect(
      app.user.create({ data: { name: "x", email: `x-${sufijo}@test.opai.cl` } }),
    ).rejects.toThrow(DENEGADO);
    await expect(app.user.delete({ where: { id: sinEmpresa } })).rejects.toThrow(DENEGADO);
    await expect(app.tenant.delete({ where: { id: tenantId } })).rejects.toThrow(DENEGADO);
  });

  it("Better Auth (clienteAuth) opera las credenciales con opai_auth, también en transacción", async () => {
    const auth = db.clienteAuth();
    expect(await auth.session.count({ where: { userId: conMfa } })).toBe(2);
    const n = await auth.$transaction((t) => t.twoFactor.count({ where: { userId: conMfa } }));
    expect(n).toBe(1);
    // Ni Better Auth puede darse rol de plataforma: opai_auth no actualiza esa columna.
    await expect(
      auth.user.update({ where: { id: miembro }, data: { platformRole: "owner" } }),
    ).rejects.toThrow(DENEGADO);
  });

  it("el último acceso solo trae la fecha por usuario", async () => {
    const m = await db.ultimosAccesos([conMfa, sinEmpresa, miembro]);
    expect([...m.keys()].sort()).toEqual([conMfa, sinEmpresa].sort());
    expect(m.get(conMfa)).toBeInstanceOf(Date);
  });

  it("restablecer el MFA borra el enrolamiento y las sesiones, y la transacción sigue como opai_app", async () => {
    const ok = await tx.enTransaccion(tenantId, async (t) => {
      const res = await db.restablecerSegundoFactor(t, conMfa);
      // Volvió al rol de la sesión (opai_app), con la RLS del tenant: nunca queda como opai_auth.
      const [rol] = await t.$queryRaw<{ r: string }[]>`SELECT current_user::text AS r`;
      expect(rol?.r).not.toBe("opai_auth");
      expect(await t.membership.count()).toBe(1);
      return res;
    });
    expect(ok).toEqual({ enrolamientos: 1, sesiones: 2 });
    expect(await e.admin.twoFactor.count({ where: { userId: conMfa } })).toBe(0);
    expect(await e.admin.session.count({ where: { userId: conMfa } })).toBe(0);
    const u = await e.admin.user.findUniqueOrThrow({ where: { id: conMfa } });
    expect(u.twoFactorEnabled).toBe(false);
  });

  it("borrar un usuario: solo por core.borrar_usuario, nunca con membresías ni rol de plataforma", async () => {
    const enTx = (id: string) => tx.enTransaccion(tenantId, (t) => db.borrarUsuario(t, id));
    expect(await enTx(miembro)).toBe("con_referencias");
    await e.admin.user.update({ where: { id: conMfa }, data: { platformRole: "support" } });
    expect(await enTx(conMfa)).toBe("plataforma");
    expect(await enTx(randomUUID())).toBe("inexistente");
    expect(await enTx(sinEmpresa)).toBe("borrado");
    expect(await e.admin.user.findUnique({ where: { id: sinEmpresa } })).toBeNull();
    expect(await e.admin.session.count({ where: { userId: sinEmpresa } })).toBe(0);
    expect(await e.forUser(miembro).membership.count()).toBe(1);
  });
});

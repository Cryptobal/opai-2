// CAR-286: passkeys. opai_app no las lee ni las escribe; la marca `users.passkey_enabled` la mantiene
// el trigger; el hot path de la sesión la devuelve; quitar, renombrar y la confirmación reciente
// corren en la transacción del llamador (tenant), con rastro en la cadena `seguridad`.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type * as Metodos from "../src/identidad-metodos";
import type * as Transaccion from "../src/transaccion";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

const DENEGADO = /permission denied|denegado/i;

describe.skipIf(!urlPropietario)("passkeys (CAR-286)", () => {
  let e: Entorno;
  let m: typeof Metodos;
  let tx: typeof Transaccion;
  const sufijo = randomUUID().slice(0, 8);
  let tenantId = "";
  let userId = "";
  let otro = "";
  const o = () => ({ tenantId, via: "persona" as const });
  const passkey = (uid: string, n: number) =>
    e.admin.passkey.create({
      data: {
        userId: uid,
        name: `Llave ${n}`,
        publicKey: "cHVibGljYQ",
        credentialID: `cred-${sufijo}-${uid.slice(-4)}-${n}`,
        counter: 0,
        deviceType: "singleDevice",
        backedUp: false,
      },
    });
  const flag = async (id: string) =>
    (await e.admin.user.findUniqueOrThrow({ where: { id } })).passkeyEnabled;

  beforeAll(async () => {
    e = await prepararEntorno();
    m = await import("../src/identidad-metodos");
    tx = await import("../src/transaccion");
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `pk-${sufijo}`, nombre: "Pk", vertical: "seguridad" },
      })
    ).id;
    const crear = async (n: string) =>
      (await e.admin.user.create({ data: { name: n, email: `${n}-${sufijo}@test.opai.cl` } })).id;
    userId = await crear("pk");
    otro = await crear("pk-otro");
    await e.admin.membership.create({
      data: { tenantId, userId, rol: "owner", portales: ["erp"] },
    });
  });

  afterAll(async () => {
    if (!e) return;
    await e.admin.membership.deleteMany({ where: { tenantId } });
    await e.admin.user.deleteMany({ where: { id: { in: [userId, otro] } } });
    await e.admin.tenant.delete({ where: { id: tenantId } });
    await e.cerrar();
  });

  it("opai_app no lee ni escribe passkeys", async () => {
    await expect(e.appSinTenant.passkey.findMany()).rejects.toThrow(DENEGADO);
    await expect(e.appSinTenant.passkey.deleteMany({})).rejects.toThrow(DENEGADO);
  });

  it("el trigger mantiene la marca y el hot path de la sesión la devuelve", async () => {
    expect(await flag(userId)).toBe(false);
    const p = await passkey(userId, 1);
    expect(await flag(userId)).toBe(true);
    const [f] = await e.appSinTenant.$queryRaw<{ passkey_enabled: boolean }[]>`
      SELECT passkey_enabled FROM core.auth_usuario_por_id(${userId}::uuid)`;
    expect(f?.passkey_enabled).toBe(true);
    await e.admin.passkey.delete({ where: { id: p.id } });
    expect(await flag(userId)).toBe(false);
  });

  it("lista solo metadatos propios y renombra/quita solo lo propio, con rastro", async () => {
    const mia = await passkey(userId, 2);
    const ajena = await passkey(otro, 3);
    const metodos = await m.metodosDeUsuario(userId);
    expect(metodos.passkeys.map((p) => p.id)).toEqual([mia.id]);
    expect(JSON.stringify(metodos)).not.toContain("cHVibGljYQ");
    const r = await tx.enTransaccion(tenantId, async (t) => ({
      ajena: await m.quitarPasskey(t, userId, ajena.id, o()),
      nombre: await m.renombrarPasskey(t, userId, mia.id, "iPhone", o()),
      quitada: await m.quitarPasskey(t, userId, mia.id, o()),
    }));
    expect(r).toEqual({ ajena: false, nombre: true, quitada: true });
    expect(await e.admin.passkey.count({ where: { id: ajena.id } })).toBe(1);
    expect(await flag(userId)).toBe(false);
    const rastro = await e.admin.$queryRaw<{ capability: string }[]>`
      SELECT capability FROM core.auditoria_global
       WHERE ambito = 'seguridad' AND entity_id = ${userId} ORDER BY seq`;
    expect(rastro.map((x) => x.capability)).toEqual([
      "seguridad.passkey.renombrada",
      "seguridad.passkey.baja",
    ]);
  });

  it("la confirmación reciente se consume una vez y la vencida no sirve", async () => {
    const id = `${m.PREFIJO_REAUTENTICACION}${userId}`;
    await e.admin.verification.create({
      data: { identifier: id, value: "1", expiresAt: new Date(Date.now() - 1000) },
    });
    const vencida = await tx.enTransaccion(tenantId, (t) => m.consumirReautenticacion(t, userId));
    expect(vencida).toBe(false);
    await e.admin.verification.create({
      data: { identifier: id, value: "1", expiresAt: new Date(Date.now() + 60_000) },
    });
    const usos = await tx.enTransaccion(tenantId, async (t) => [
      await m.consumirReautenticacion(t, userId),
      await m.consumirReautenticacion(t, userId),
    ]);
    expect(usos).toEqual([true, false]);
  });
});

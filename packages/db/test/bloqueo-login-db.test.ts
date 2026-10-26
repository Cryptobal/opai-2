// B1 (Brief 07c): el bloqueo de login se decide contando los intentos de contraseña fallidos de
// `core.login_intentos` (append-only, sin RLS como `users`), no con un contador mutable. Esta prueba
// usa dos conexiones `opai_app` distintas contra la misma base (dos «instancias») para comprobar que
// anexar y contar no pierde intentos bajo concurrencia, que la tabla es solo-anexar para la
// aplicación, que el conteo no depende de que el usuario exista, y que la purga `SECURITY DEFINER`
// borra lo viejo aunque `opai_app` no pueda borrar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("bloqueo de login por conteo (B1)", () => {
  let e: Entorno;
  let instanciaB: PrismaClient;
  const hashes: string[] = [];
  const nuevoHash = (): string => {
    const h = randomUUID().replace(/-/g, "");
    hashes.push(h);
    return h;
  };
  const fallo = (correoHash: string, ip: string, createdAt?: Date) => ({
    correoHash,
    exito: false,
    motivo: "credenciales",
    ip,
    ...(createdAt ? { createdAt } : {}),
  });

  beforeAll(async () => {
    e = await prepararEntorno();
    // Segunda «instancia»: otra conexión con el mismo rol de aplicación contra la misma base.
    instanciaB = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"] as string }),
    });
  });

  afterAll(async () => {
    await instanciaB?.$disconnect();
    if (e) {
      if (hashes.length) await e.admin.loginIntento.deleteMany({ where: { correoHash: { in: hashes } } });
      await e.cerrar();
    }
  });

  it("solo-anexar: opai_app inserta y lee, pero no actualiza ni borra", async () => {
    const correoHash = nuevoHash();
    await e.appSinTenant.loginIntento.create({ data: fallo(correoHash, "203.0.113.1") });
    await expect(
      e.appSinTenant.loginIntento.updateMany({ where: { correoHash }, data: { motivo: "x" } }),
    ).rejects.toThrow();
    await expect(
      e.appSinTenant.loginIntento.deleteMany({ where: { correoHash } }),
    ).rejects.toThrow();
  });

  it("cuenta por el hash del correo aunque no exista el usuario (user_id null)", async () => {
    const correoHash = nuevoHash();
    for (let i = 0; i < 4; i++) {
      await e.appSinTenant.loginIntento.create({
        data: { ...fallo(correoHash, "198.51.100.7"), userId: null },
      });
    }
    const n = await instanciaB.loginIntento.count({ where: { correoHash, motivo: "credenciales" } });
    expect(n).toBe(4);
  });

  it("dos conexiones anexan fallos en paralelo sin perder ninguno (sin carrera de contador)", async () => {
    const correoHash = nuevoHash();
    const N = 10;
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        (i % 2 === 0 ? e.appSinTenant : instanciaB).loginIntento.create({
          data: fallo(correoHash, `203.0.113.${i}`),
        }),
      ),
    );
    // Cada fallo es un INSERT independiente: con un upsert `fallos = fallos + 1` leído-modificado
    // dos escrituras simultáneas se pisarían; anexando y contando no se pierde ninguno.
    const n = await instanciaB.loginIntento.count({ where: { correoHash, motivo: "credenciales" } });
    expect(n).toBe(N);
  });

  it("la purga SECURITY DEFINER borra lo viejo aunque opai_app no pueda borrar", async () => {
    const correoHash = nuevoHash();
    const viejo = new Date(Date.now() - 40 * 24 * 60 * 60_000);
    await e.appSinTenant.loginIntento.create({ data: fallo(correoHash, "192.0.2.9", viejo) });
    expect(await instanciaB.loginIntento.count({ where: { correoHash } })).toBe(1);
    const r = await e.appSinTenant.$queryRaw<{ purgados: number }[]>`
      SELECT "core"."purgar_login_intentos"(30::int) AS purgados`;
    expect(Number(r[0]?.purgados ?? 0)).toBeGreaterThanOrEqual(1);
    expect(await instanciaB.loginIntento.count({ where: { correoHash } })).toBe(0);
  });
});

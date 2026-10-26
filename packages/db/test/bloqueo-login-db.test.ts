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

  it("un restablecimiento (éxito) reinicia el conteo del correo", async () => {
    // Bloqueante 1 (revisión PR #46): un restablecimiento de contraseña exitoso reinicia el contador
    // global del correo. Se anota como un éxito (motivo "reset"); solo cuentan los fallos posteriores.
    const correoHash = nuevoHash();
    const base = Date.now();
    for (let i = 0; i < 4; i++) {
      await e.appSinTenant.loginIntento.create({
        data: fallo(correoHash, "198.51.100.8", new Date(base - 300_000 + i * 1000)),
      });
    }
    await e.appSinTenant.loginIntento.create({
      data: { correoHash, exito: true, motivo: "reset", ip: null, createdAt: new Date(base - 60_000) },
    });
    const ultimo = await instanciaB.loginIntento.findFirst({
      where: { correoHash, exito: true },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const n = await instanciaB.loginIntento.count({
      where: { correoHash, motivo: { in: ["pendiente", "credenciales"] }, createdAt: { gt: ultimo!.createdAt } },
    });
    expect(n).toBe(0);
  });

  it("una IP que entró bien al correo hace poco queda exenta del tope global", async () => {
    // Bloqueante 1 (revisión PR #46): la exención se resuelve con un éxito (exito=true) de esa IP a
    // ese correo dentro de la retención (30 días). Otra IP, sin ese éxito, no queda exenta.
    const correoHash = nuevoHash();
    const ipBuena = "203.0.113.50";
    await e.appSinTenant.loginIntento.create({ data: { correoHash, exito: true, motivo: "ok", ip: ipBuena } });
    const exencion = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const exenta = await instanciaB.loginIntento.findFirst({
      where: { correoHash, ip: ipBuena, exito: true, createdAt: { gt: exencion } },
      select: { id: true },
    });
    expect(exenta).not.toBeNull();
    const otra = await instanciaB.loginIntento.findFirst({
      where: { correoHash, ip: "203.0.113.51", exito: true, createdAt: { gt: exencion } },
      select: { id: true },
    });
    expect(otra).toBeNull();
  });

  it("marcar_login_intento resuelve UN provisional del mismo correo e IP (SKIP LOCKED)", async () => {
    // La resolución del provisional va por la función SECURITY DEFINER: opai_app no puede UPDATE, pero
    // sí ejecutarla; marca un solo provisional por llamada y devuelve false si ya no quedan.
    const correoHash = nuevoHash();
    const ip = "203.0.113.60";
    for (let i = 0; i < 2; i++) {
      await e.appSinTenant.loginIntento.create({ data: { correoHash, ip, exito: false, motivo: "pendiente" } });
    }
    await e.appSinTenant.$queryRaw`SELECT "core"."marcar_login_intento"(${correoHash}::text, ${ip}::text, true, 'ok')`;
    await e.appSinTenant.$queryRaw`SELECT "core"."marcar_login_intento"(${correoHash}::text, ${ip}::text, false, 'credenciales')`;
    expect(await instanciaB.loginIntento.count({ where: { correoHash, motivo: "pendiente" } })).toBe(0);
    expect(await instanciaB.loginIntento.count({ where: { correoHash, exito: true, motivo: "ok" } })).toBe(1);
    expect(await instanciaB.loginIntento.count({ where: { correoHash, motivo: "credenciales" } })).toBe(1);
    const sinProvisional = await e.appSinTenant.$queryRaw<{ marcar_login_intento: boolean }[]>`
      SELECT "core"."marcar_login_intento"(${correoHash}::text, ${ip}::text, false, 'credenciales')`;
    expect(sinProvisional[0]?.marcar_login_intento).toBe(false);
  });

  it("ráfaga concurrente del mismo correo e IP: validan como máximo 5 (advisory lock)", async () => {
    // Bloqueante 3 (revisión PR #46): cuenta e inserta el provisional en una transacción bajo
    // pg_advisory_xact_lock por correo (espejo de `reservarIntento` de @opai/auth). Aunque 10 intentos
    // lleguen a la vez por dos conexiones, se serializan y solo 5 llegan a validar (el resto se pausa).
    const correoHash = nuevoHash();
    const ip = "203.0.113.70";
    const reservar = (db: PrismaClient): Promise<boolean> =>
      db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${correoHash}, 0))`;
        const n = await tx.loginIntento.count({
          where: { correoHash, ip, motivo: { in: ["pendiente", "credenciales"] } },
        });
        if (n >= 5) return true;
        await tx.loginIntento.create({ data: { correoHash, ip, exito: false, motivo: "pendiente" } });
        return false;
      });
    const resultados = await Promise.all(
      Array.from({ length: 10 }, (_, i) => reservar(i % 2 === 0 ? e.appSinTenant : instanciaB)),
    );
    expect(resultados.filter((pausado) => pausado === false).length).toBe(5);
    expect(await instanciaB.loginIntento.count({ where: { correoHash, motivo: "pendiente" } })).toBe(5);
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

// B1 (Brief 07c): el estado de bloqueo de login y el registro de intentos viven en `core`, sin
// tenant_id ni RLS (como `users`), así que sobreviven a un reinicio y se comparten entre instancias.
// Esta prueba usa dos conexiones `opai_app` distintas contra la misma base (dos «instancias»).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("bloqueo de login persistido (B1)", () => {
  let e: Entorno;
  let instanciaB: PrismaClient;
  let userId = "";
  const sufijo = randomUUID().slice(0, 8);

  beforeAll(async () => {
    e = await prepararEntorno();
    // Segunda «instancia»: otra conexión con el mismo rol de aplicación contra la misma base.
    instanciaB = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"] as string }),
    });
    userId = (await e.admin.user.create({ data: { name: "Fulano", email: `fb-${sufijo}@test.opai.cl` } }))
      .id;
  });

  afterAll(async () => {
    await instanciaB?.$disconnect();
    if (e) {
      await e.admin.loginIntento.deleteMany({ where: { userId } });
      await e.admin.user.deleteMany({ where: { id: userId } });
      await e.cerrar();
    }
  });

  it("sin RLS: la aplicación lee y escribe el bloqueo aunque no haya tenant fijado", async () => {
    const hasta = new Date(Date.now() + 15 * 60_000);
    // Instancia A escribe el bloqueo (como lo haría el hook de `@opai/auth`).
    await e.appSinTenant.loginBloqueo.create({
      data: { userId, fallos: 5, bloqueadoHasta: hasta, ultimoIntento: new Date() },
    });
    // Instancia B, conexión aparte, ve exactamente el mismo estado persistido.
    const visto = await instanciaB.loginBloqueo.findUnique({ where: { userId } });
    expect(visto?.fallos).toBe(5);
    expect(visto?.bloqueadoHasta?.getTime()).toBe(hasta.getTime());
  });

  it("una actualización en una instancia la ve la otra (estado compartido, no en memoria)", async () => {
    await e.appSinTenant.loginBloqueo.update({
      where: { userId },
      data: { fallos: 0, bloqueadoHasta: null },
    });
    const visto = await instanciaB.loginBloqueo.findUnique({ where: { userId } });
    expect(visto?.fallos).toBe(0);
    expect(visto?.bloqueadoHasta).toBeNull();
  });

  it("los intentos son append-only y se consultan por hash del correo, sin dato personal en claro", async () => {
    const correoHash = randomUUID().replace(/-/g, "");
    for (const exito of [false, false, true]) {
      await e.appSinTenant.loginIntento.create({
        data: { correoHash, userId, exito, motivo: exito ? "ok" : "credenciales", ip: "203.0.113.1" },
      });
    }
    const filas = await instanciaB.loginIntento.findMany({ where: { correoHash } });
    expect(filas).toHaveLength(3);
    expect(filas.filter((f) => f.exito)).toHaveLength(1);
    // Nunca se guarda el correo en claro: solo su hash.
    expect(filas.every((f) => f.correoHash === correoHash)).toBe(true);
  });
});

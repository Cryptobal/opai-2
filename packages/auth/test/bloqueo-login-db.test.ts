// B1 (Brief 07c, CAR-16): prueba del camino REAL `before` → UUID → `after` con Better Auth y Postgres:
// `auth.api.signInEmail` pasa por los hooks de `auth.ts`, así que si el `after` perdiera el id del
// provisional (p. ej. porque Better Auth cambiara cómo une el contexto) estas pruebas fallarían.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

const PASSWORD = "Clave-de-prueba-123";

describe.skipIf(!urlPropietario)("bloqueo de login con Better Auth real (B1)", () => {
  let e: Entorno;
  let auth: typeof import("../src/auth").auth;
  let hashCorreo: typeof import("../src/bloqueo-login").hashCorreo;
  const correos: string[] = [];

  async function crearUsuario(): Promise<string> {
    const email = `bloqueo-${randomUUID().slice(0, 8)}@prueba.opai.cl`;
    correos.push(email);
    const ctx = await auth.$context;
    const user = await e.admin.user.create({ data: { name: "Prueba", email } });
    await e.admin.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: await ctx.password.hash(PASSWORD),
      },
    });
    return email;
  }

  const entrar = (email: string, password: string, ip: string | null) =>
    auth.api
      .signInEmail({
        body: { email, password },
        headers: new Headers(ip ? { "x-forwarded-for": ip } : {}),
      })
      .then(() => 200)
      .catch((err: unknown) => Number(Reflect.get(err as object, "statusCode")));

  const filas = (email: string) =>
    e.admin.loginIntento.findMany({ where: { correoHash: hashCorreo(email) } });

  const sembrar = (email: string, datos: { ip: string | null; exito: boolean; motivo: string }[]) =>
    e.admin.loginIntento.createMany({
      data: datos.map((d) => ({ correoHash: hashCorreo(email), ...d })),
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    process.env["BETTER_AUTH_SECRET"] ??= randomUUID() + randomUUID();
    process.env["BETTER_AUTH_URL"] ??= "http://localhost:3000";
    ({ auth } = await import("../src/auth"));
    ({ hashCorreo } = await import("../src/bloqueo-login"));
  }, 120_000);

  afterAll(async () => {
    if (e) {
      const hashes = correos.map((c) => hashCorreo(c));
      await e.admin.loginIntento.deleteMany({ where: { correoHash: { in: hashes } } });
      await e.admin.user.deleteMany({ where: { email: { in: correos } } });
      await e.cerrar();
    }
  });

  it("ingreso correcto → provisional resuelto a ok; contraseña mala → credenciales", async () => {
    const email = await crearUsuario();
    expect(await entrar(email, "mala-clave-123", "203.0.113.10")).toBe(401);
    expect(await entrar(email, PASSWORD, "203.0.113.10")).toBe(200);
    const f = await filas(email);
    expect(f.filter((x) => x.motivo === "pendiente")).toHaveLength(0);
    expect(f.filter((x) => x.motivo === "credenciales" && !x.exito)).toHaveLength(1);
    expect(f.filter((x) => x.motivo === "ok" && x.exito)).toHaveLength(1);
  });

  it("ingresos concurrentes → cada uno resuelve SU provisional (UUID distintos)", async () => {
    const email = await crearUsuario();
    const r = await Promise.all([
      entrar(email, PASSWORD, "203.0.113.20"),
      entrar(email, PASSWORD, "203.0.113.20"),
      entrar(email, "mala-clave-123", "203.0.113.20"),
    ]);
    expect(r.sort()).toEqual([200, 200, 401]);
    const f = await filas(email);
    expect(new Set(f.map((x) => x.id)).size).toBe(3);
    expect(f.filter((x) => x.motivo === "pendiente")).toHaveLength(0);
    expect(f.filter((x) => x.motivo === "ok")).toHaveLength(2);
  });

  it("ráfaga de 10 intentos malos del mismo correo e IP: validan 5 y el resto recibe 429", async () => {
    const email = await crearUsuario();
    const r = await Promise.all(
      Array.from({ length: 10 }, () => entrar(email, "mala-clave-123", "203.0.113.30")),
    );
    expect(r.filter((s) => s === 401)).toHaveLength(5);
    expect(r.filter((s) => s === 429)).toHaveLength(5);
  });

  it("exención: con 20 fallos globales, la IP con ingreso previo `ok` entra; otra IP no", async () => {
    const email = await crearUsuario();
    expect(await entrar(email, PASSWORD, "203.0.113.40")).toBe(200);
    await sembrar(
      email,
      Array.from({ length: 20 }, (_, i) => ({
        ip: `198.51.100.${i + 1}`,
        exito: false,
        motivo: "credenciales",
      })),
    );
    expect(await entrar(email, PASSWORD, "203.0.113.41")).toBe(429);
    expect(await entrar(email, PASSWORD, "203.0.113.40")).toBe(200);
  });

  it("exención: un `reset` (sin IP) no exime a quien llega sin IP", async () => {
    const email = await crearUsuario();
    await sembrar(email, [{ ip: null, exito: true, motivo: "reset" }]);
    await sembrar(
      email,
      Array.from({ length: 20 }, (_, i) => ({
        ip: `198.51.100.${i + 1}`,
        exito: false,
        motivo: "credenciales",
      })),
    );
    expect(await entrar(email, PASSWORD, null)).toBe(429);
  });

  it("la IP exenta con contraseña correcta entra aunque otras IP martillen el mismo correo", async () => {
    const email = await crearUsuario();
    expect(await entrar(email, PASSWORD, "203.0.113.50")).toBe(200);
    await sembrar(
      email,
      Array.from({ length: 20 }, (_, i) => ({
        ip: `198.51.100.${i + 1}`,
        exito: false,
        motivo: "credenciales",
      })),
    );
    const ataque = Array.from({ length: 12 }, (_, i) =>
      entrar(email, "mala-clave-123", `192.0.2.${i + 1}`),
    );
    const [legitimo] = await Promise.all([entrar(email, PASSWORD, "203.0.113.50"), ...ataque]);
    expect(legitimo).toBe(200);
  });
});

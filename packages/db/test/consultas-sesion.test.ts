// ADR-045 / CAR-50: el contador de consultas por request cuenta UNA consulta lógica por cada lectura
// de sesión y de usuario del hot path. Las dos pasan por funciones SECURITY DEFINER dentro del hook
// de modelos de `clienteAuth()`: si además avisaran por su cuenta, cada request contaría 2 de más y
// el gate de rendimiento (tope de 8 consultas) fallaría sin que cambie ninguna pantalla.
// Solo `pnpm test:db` (Postgres real).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { clienteAuth } from "../src/identidad";
import { registrarObservadorConsultas } from "../src/metricas";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("Auth · conteo de consultas del hot path de sesión", () => {
  let e: Entorno;
  let uid = "";
  const tok = `tok_${randomUUID()}`;

  beforeAll(async () => {
    e = await prepararEntorno();
    const u = await e.admin.user.create({
      data: { name: "c", email: `c-${randomUUID().slice(0, 8)}@test.opai.cl` },
    });
    uid = u.id;
    await e.admin.session.create({
      data: { token: tok, userId: uid, expiresAt: new Date(Date.now() + 3_600_000) },
    });
  }, 120_000);

  afterAll(async () => {
    registrarObservadorConsultas(null);
    if (!e) return;
    await e.admin.session.deleteMany({ where: { userId: uid } });
    await e.admin.user.deleteMany({ where: { id: uid } });
    await e.cerrar();
  });

  async function contar(fn: () => Promise<unknown>): Promise<number> {
    let n = 0;
    registrarObservadorConsultas(() => n++);
    try {
      await fn();
    } finally {
      registrarObservadorConsultas(null);
    }
    return n;
  }

  it("la sesión por token (con su usuario) cuenta una sola consulta", async () => {
    let sesion: unknown = null;
    const n = await contar(async () => {
      sesion = await clienteAuth().session.findFirst({
        where: { token: tok },
        select: { id: true, token: true, userId: true, user: true },
      });
    });
    expect(sesion).not.toBeNull();
    expect(n).toBe(1);
  });

  it("el usuario por id cuenta una sola consulta", async () => {
    let usuario: unknown = null;
    const n = await contar(async () => {
      usuario = await clienteAuth().user.findFirst({ where: { id: uid } });
    });
    expect(usuario).not.toBeNull();
    expect(n).toBe(1);
  });

  it("una lectura que no es del hot path (findMany) sigue contando una sola", async () => {
    const n = await contar(() => clienteAuth().session.findMany({ where: { userId: uid } }));
    expect(n).toBe(1);
  });
});

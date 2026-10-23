// Almacén de secretos contra Postgres real: guardar cifrado, rotar la KEK con el script y leer.
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("secretos y rotación de KEK en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const previas = { ...process.env };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
  });

  afterAll(async () => {
    for (const k of ["OPAI_SECRETS_KEY", "OPAI_SECRETS_KEY_VERSION", "OPAI_SECRETS_KEY_ANTERIOR"]) {
      if (previas[k] === undefined) delete process.env[k];
      else process.env[k] = previas[k];
    }
    await e?.cerrar();
  });

  it("guarda cifrado, nunca en claro, y sigue legible tras rotar la KEK", async () => {
    const v1 = randomBytes(32).toString("base64");
    const v2 = randomBytes(32).toString("base64");
    const slug = `kek-${randomUUID().slice(0, 8)}`;
    const t = await e.admin.tenant.create({ data: { slug, nombre: "K", vertical: "seguridad" } });
    Object.assign(process.env, { OPAI_SECRETS_KEY: v1, OPAI_SECRETS_KEY_VERSION: "1" });
    delete process.env["OPAI_SECRETS_KEY_ANTERIOR"];
    const ctx = () =>
      mod.crearContexto({
        tenantId: t.id,
        actor: { tipo: "system" },
        rol: "owner",
        medidor: { registrar: async () => undefined },
      });
    const valor = "re_secreto_123456";
    const r = await mod.executeCapability(ctx(), "core.integraciones.set_secreto", {
      proveedor: "resend",
      nombre: "api_key",
      valor,
    });
    expect(r.ok).toBe(true);
    const fila = await e.admin.secreto.findFirstOrThrow({ where: { tenantId: t.id } });
    expect(Buffer.from(fila.cifrado).toString("utf8")).not.toContain(valor);
    const auditoria = await e.admin.auditEvent.findMany({ where: { tenantId: t.id } });
    expect(JSON.stringify(auditoria)).not.toContain(valor);
    execFileSync("pnpm", ["exec", "tsx", "scripts/rotar-kek.ts"], {
      cwd: new URL("..", import.meta.url).pathname,
      env: {
        ...process.env,
        OPAI_SECRETS_KEY: v2,
        OPAI_SECRETS_KEY_VERSION: "2",
        OPAI_SECRETS_KEY_ANTERIOR: v1,
      },
      stdio: "pipe",
    });
    Object.assign(process.env, { OPAI_SECRETS_KEY: v2, OPAI_SECRETS_KEY_VERSION: "2" });
    const { leerSecreto } = await import("../src/integraciones/secretos");
    expect(await leerSecreto(ctx(), fila.integracionId, "api_key")).toBe(valor);
  }, 60_000);
});

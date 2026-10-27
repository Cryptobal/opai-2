// Medidor de consumos de IA contra Postgres real (ADR-031): con key propia (BYOK) el costo es 0;
// con la key de plataforma (OPAI) el costo es mayor que 0. Dos tenants, para fijar el aislamiento.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

/** Respuesta de Anthropic simulada: 9 tokens de entrada y 1 de salida. */
const respuestaAnthropic = () =>
  vi.fn(async () =>
    Response.json({
      content: [{ type: "text", text: "ok" }],
      usage: { input_tokens: 9, output_tokens: 1 },
      stop_reason: "end_turn",
    }),
  );

describe.skipIf(!urlPropietario)("medidor de IA en base real: BYOK sin costo, OPAI con costo", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const previas = { ...process.env };

  beforeAll(async () => {
    e = await prepararEntorno();
    process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
    process.env["OPAI_SECRETS_KEY_VERSION"] = "1";
    process.env["ANTHROPIC_API_KEY"] = "sk-ant-plataforma-opai";
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    // Precio de plataforma para la clase económica (micro-USD por token).
    await e.admin.precioRecurso.createMany({
      data: [
        { recurso: "ia.economica.entrada", unidad: "token", costoUnitarioMicro: 2, vigenteDesde: new Date("2020-01-01") },
        { recurso: "ia.economica.salida", unidad: "token", costoUnitarioMicro: 3, vigenteDesde: new Date("2020-01-01") },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    for (const kk of ["OPAI_SECRETS_KEY", "OPAI_SECRETS_KEY_VERSION", "ANTHROPIC_API_KEY"]) {
      if (previas[kk] === undefined) delete process.env[kk];
      else process.env[kk] = previas[kk];
    }
    await e?.cerrar();
  });

  const ctxDe = (tenantId: string) =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner" });

  const consumosIa = (tenantId: string) =>
    e.admin.consumo.findMany({ where: { tenantId, recurso: { startsWith: "ia." } } });

  it("con key propia del tenant, el consumo de IA queda en costo 0", async () => {
    const t = await e.admin.tenant.create({
      data: { slug: `ia-byok-${randomUUID().slice(0, 8)}`, nombre: "BYOK", vertical: "seguridad" },
    });
    const ctx = ctxDe(t.id);
    await mod.executeCapability(ctx, "core.integraciones.configurar", {
      proveedor: "ia_anthropic",
      modalidad: "propia",
    });
    await mod.executeCapability(ctx, "core.integraciones.set_secreto", {
      proveedor: "ia_anthropic",
      nombre: "api_key",
      valor: "sk-ant-propia-del-tenant",
    });
    vi.stubGlobal("fetch", respuestaAnthropic());
    const ia = await mod.iaDe(ctx, "economica");
    const r = await ia?.conversar({ mensajes: [{ rol: "usuario", texto: "hola" }] });
    vi.unstubAllGlobals();
    expect(r?.proveedor).toBe("ia_anthropic");
    const filas = await consumosIa(t.id);
    expect(filas.map((f) => f.recurso).sort()).toEqual(["ia.economica.entrada", "ia.economica.salida"]);
    expect(filas.every((f) => f.costoTotalMicro === 0 && f.costoUnitarioMicro === 0)).toBe(true);
    expect(filas.every((f) => f.referenciaId === "ia_anthropic:claude-haiku-5-5")).toBe(true);
  }, 60_000);

  it("con la key de plataforma (OPAI), el consumo de IA tiene costo mayor que 0", async () => {
    const t = await e.admin.tenant.create({
      data: { slug: `ia-opai-${randomUUID().slice(0, 8)}`, nombre: "OPAI", vertical: "seguridad" },
    });
    const ctx = ctxDe(t.id);
    vi.stubGlobal("fetch", respuestaAnthropic());
    const ia = await mod.iaDe(ctx, "economica");
    const r = await ia?.conversar({ mensajes: [{ rol: "usuario", texto: "hola" }] });
    vi.unstubAllGlobals();
    expect(r?.proveedor).toBe("ia_anthropic");
    const filas = await consumosIa(t.id);
    expect(filas.map((f) => f.recurso).sort()).toEqual(["ia.economica.entrada", "ia.economica.salida"]);
    const total = filas.reduce((s, f) => s + f.costoTotalMicro, 0);
    expect(total).toBe(9 * 2 + 1 * 3); // 21 micro-USD
    expect(total).toBeGreaterThan(0);
  }, 60_000);
});

import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const plataforma = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
const ahora = new Date();
const K = "01a16a49-0000-7000-8000-00000000000a";

function semilla() {
  const s = semillaTenant();
  const consumo = (recurso: string, cantidad: number, micro: number, apiKeyId: string | null) => ({
    id: crypto.randomUUID(),
    tenantId: TENANT_DE_PRUEBA,
    recurso,
    unidad: "u",
    cantidad,
    costoTotalMicro: micro,
    modulo: "core",
    actorTipo: "agent",
    apiKeyId,
    createdAt: ahora,
  });
  return {
    ...s,
    apiKey: [
      {
        id: K,
        tenantId: TENANT_DE_PRUEBA,
        userId: USUARIO_DE_PRUEBA.id,
        nombre: "Grokbot",
        prefijo: "opai_gard_ab",
        hash: "x",
        scopes: ["*"],
        presupuestoMensualMicro: 20_000_000n,
        revocadaEn: null,
        ultimoUsoEn: null,
        createdAt: ahora,
      },
    ],
    consumo: [
      consumo("ia.tokens_entrada", 1_000, 16_400_000, K),
      consumo("capacidad.ejecucion", 3, 0, K),
      consumo("correo.enviado", 2, 0, null),
    ],
    trabajo: [
      {
        id: crypto.randomUUID(),
        tenantId: TENANT_DE_PRUEBA,
        tipo: "outbox.correo",
        payload: { a: 1 },
        estado: "fallido",
        intentos: 5,
        maxIntentos: 5,
        programadoPara: ahora,
        ultimoError: "401",
        createdAt: ahora,
        updatedAt: ahora,
      },
      {
        id: crypto.randomUUID(),
        tenantId: TENANT_DE_PRUEBA,
        tipo: "documentos.alertas",
        payload: {},
        estado: "hecho",
        intentos: 1,
        maxIntentos: 5,
        programadoPara: ahora,
        ultimoError: null,
        createdAt: ahora,
        updatedAt: ahora,
      },
    ],
  };
}

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const ctxPlataforma = () =>
  contextoDePrueba({ rol: null, usuario: plataforma, conTenant: false, semilla: semilla() });

describe("pantallas de Plataforma", () => {
  it("tenants.list trae IA del mes y última actividad", async () => {
    const { ctx } = ctxPlataforma();
    const r = await executeCapability(ctx, "platform.tenants.list", {});
    expect(r).toMatchObject({
      ok: true,
      data: [{ slug: "gard", iaMesUsd: 16.4, modulosTrial: 0 }],
    });
  });

  it("tenants.panel: consumo del mes, gasto por key y trabajos con problemas", async () => {
    const { ctx } = ctxPlataforma();
    const r = await executeCapability(ctx, "platform.tenants.panel", {
      tenantId: TENANT_DE_PRUEBA,
    });
    expect(r).toMatchObject({
      ok: true,
      data: {
        mes: { iaUsd: 16.4, correos: 2, llamadas: 3 },
        keys: [{ nombre: "Grokbot", gastadoUsd: 16.4, presupuestoUsd: 20 }],
        trabajos: { fallidos: 1, reintentando: 0 },
      },
    });
  });

  it("trabajos.list sin empresa lista todas; conProblemas deja los fallidos", async () => {
    const { ctx } = ctxPlataforma();
    const r = await executeCapability(ctx, "platform.trabajos.list", { conProblemas: true });
    expect(r).toMatchObject({
      ok: true,
      data: [{ tipo: "outbox.correo", empresa: "Gard Security" }],
    });
    expect(r.ok && (r.data as unknown[]).length).toBe(1);
  });

  it("precios: fijar versiona y list devuelve el vigente; support no puede fijar", async () => {
    const { ctx } = ctxPlataforma();
    const set = await executeCapability(ctx, "platform.precios.set", {
      recurso: "correo.enviado",
      unidad: "correo",
      costoUnitarioMicro: 1_000,
    });
    expect(set).toMatchObject({ ok: true });
    expect(await executeCapability(ctx, "platform.precios.list", {})).toMatchObject({
      ok: true,
      data: [{ recurso: "correo.enviado", costoUnitarioMicro: 1_000 }],
    });
    const soporte = contextoDePrueba({
      rol: null,
      usuario: { ...plataforma, platformRole: "support" },
      conTenant: false,
    });
    const w = await executeCapability(soporte.ctx, "platform.precios.set", {
      recurso: "correo.enviado",
      unidad: "correo",
      costoUnitarioMicro: 0,
    });
    expect(w).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

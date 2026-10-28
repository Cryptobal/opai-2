import { destinoVinculo } from "./vinculo-fixture";
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { herramientasMcp } from "../src/mcp";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import type { AgenteContexto, Contexto } from "../src/types";
import { codigo, dato, reiniciar } from "./maestros-ayuda";
import { semillaTenant } from "./semilla";

beforeEach(reiniciar);

const KEY = "0192f3a0-0000-7000-8000-00000000c0de";

function escenario(agente: Partial<AgenteContexto> = {}) {
  const semilla = {
    ...semillaTenant(),
    apiKey: [{ id: KEY, nombre: "Agente RR.HH.", userId: USUARIO_DE_PRUEBA.id, scopes: ["*"] }],
  };
  const p = contextoDePrueba({
    semilla,
    actor: { tipo: "agent", id: KEY, viaUserId: USUARIO_DE_PRUEBA.id },
    agente: {
      apiKeyId: KEY,
      nombre: "Agente RR.HH.",
      presupuestoMensualMicro: null,
      autonomia: {},
      ...agente,
    },
  });
  const humano: Contexto = {
    ...p.ctx,
    actor: { tipo: "user", id: USUARIO_DE_PRUEBA.id },
    agente: null,
  };
  return { ...p, humano };
}

async function vinculoVigente(ctx: Contexto) {
  const { id: cargoId } = await dato<{ id: string }>(ctx, "core.cargos.create", {
    nombre: "Guardia",
  });
  const p = await dato<{ vinculoVigente: { id: string } }>(ctx, "core.personas.create", {
    nombres: "Ana",
    apellidos: "Rojas",
    rut: "19.876.543-0",
    vinculo: { ...(await destinoVinculo(ctx)), cargoId, tipo: "indefinido", inicio: "2025-01-02" },
  });
  return p.vinculoVigente.id;
}

describe("aprobación humana de lo irreversible", () => {
  it("el agente no ejecuta: crea la aprobación; la vista previa no la crea; la misma clave no duplica", async () => {
    const { ctx, humano, tabla } = escenario();
    const id = await vinculoVigente(humano);
    const input = { id, termino: "2026-10-31", motivo: "Renuncia voluntaria" };
    expect(
      await executeCapability(ctx, "core.vinculos.terminar", input, { dryRun: true }),
    ).toMatchObject({ ok: true, dryRun: true });
    expect(tabla("aprobacion")).toHaveLength(0);
    const r = await executeCapability(ctx, "core.vinculos.terminar", input, {
      idempotencyKey: "term-1",
    });
    expect(r).toMatchObject({
      ok: false,
      error: { code: "APPROVAL_REQUIRED", aprobacionId: expect.any(String) },
    });
    const r2 = await executeCapability(ctx, "core.vinculos.terminar", input, {
      idempotencyKey: "term-1",
    });
    expect(r2.ok ? null : r2.error.aprobacionId).toBe(r.ok ? null : r.error.aprobacionId);
    expect(tabla("aprobacion")).toHaveLength(1);
    expect(tabla("vinculoLaboral")[0]?.["estado"]).toBe("vigente");
    expect(tabla("evento").map((e) => e["tipo"])).toContain("core.aprobacion.pendiente");
  });

  it("solo una persona aprueba; al aprobar se ejecuta y se audita con la aprobación", async () => {
    const { ctx, humano, tabla, eventos } = escenario();
    const id = await vinculoVigente(humano);
    const r = await executeCapability(ctx, "core.vinculos.terminar", {
      id,
      termino: "2026-10-31",
      motivo: "Renuncia voluntaria",
    });
    const aprobacionId = r.ok ? "" : (r.error.aprobacionId ?? "");
    expect(await codigo(ctx, "core.aprobaciones.aprobar", { id: aprobacionId })).toBe("FORBIDDEN");
    const ok = await dato<{ estado: string; resultado: { ok: boolean } }>(
      humano,
      "core.aprobaciones.aprobar",
      { id: aprobacionId },
    );
    expect(ok).toMatchObject({ estado: "aprobada", resultado: { ok: true } });
    expect(tabla("vinculoLaboral")[0]?.["estado"]).toBe("terminado");
    const auditado = eventos.find(
      (e) => e.capability === "core.vinculos.terminar" && !("intento" in (e.payload as object)),
    );
    expect(auditado?.payload).toMatchObject({ aprobacionId, apiKeyId: KEY });
    expect(
      await codigo(humano, "core.aprobaciones.rechazar", { id: aprobacionId, motivo: "tarde" }),
    ).toBe("CONFLICT");
    expect(await dato(ctx, "core.aprobaciones.get", { id: aprobacionId })).toMatchObject({
      estado: "aprobada",
    });
  });

  it("con autonomía directa ejecuta; 'directo' solo lo da owner o admin", async () => {
    const conAutonomia = escenario({ autonomia: { "core.vinculos.terminar": "directo" } });
    const id = await vinculoVigente(conAutonomia.humano);
    expect(
      await codigo(conAutonomia.ctx, "core.vinculos.terminar", {
        id,
        termino: "2026-10-31",
        motivo: "Fin de contrato",
      }),
    ).toBe("OK");
    const admin = escenario();
    const r = await dato(admin.humano, "core.apikeys.set_autonomia", {
      apiKeyId: KEY,
      capability: "core.vinculos.terminar",
      nivel: "directo",
    });
    expect(r).toMatchObject({ nivel: "directo" });
    expect(
      await codigo(admin.humano, "core.apikeys.set_autonomia", {
        apiKeyId: KEY,
        capability: "core.cuentas.list",
        nivel: "directo",
      }),
    ).toBe("UNPROCESSABLE");
  });
});

describe("presupuesto de agentes", () => {
  it("avisa al 80 % una vez y corta al 100 % con BUDGET_EXCEEDED", async () => {
    const { ctx, tabla } = escenario({ presupuestoMensualMicro: 1_000_000n });
    const consumo = (micro: number) =>
      tabla("consumo").push({
        tenantId: ctx.tenantId,
        apiKeyId: KEY,
        recurso: "ia.estandar.salida",
        cantidad: 1,
        costoTotalMicro: micro,
        createdAt: new Date(),
      });
    consumo(850_000);
    expect((await executeCapability(ctx, "core.cuentas.list", {})).ok).toBe(true);
    expect((await executeCapability(ctx, "core.cuentas.list", {})).ok).toBe(true);
    expect(tabla("evento").filter((e) => e["tipo"] === "core.agente.presupuesto_80")).toHaveLength(
      1,
    );
    consumo(200_000);
    expect(await codigo(ctx, "core.cuentas.list", {})).toBe("BUDGET_EXCEEDED");
    expect(tabla("evento").filter((e) => e["tipo"] === "core.agente.presupuesto_100")).toHaveLength(
      1,
    );
  });
});

describe("MCP", () => {
  it("las herramientas con campos externos lo dicen en su descripción", () => {
    const { ctx } = escenario();
    const h = herramientasMcp(ctx).find((x) => x.nombre === "core_documentos_list");
    expect(h?.descripcion).toMatch(/Campos externos/);
  });

  it("un agente no ve ni puede usar el gobierno de agentes", async () => {
    const { ctx } = escenario();
    const nombres = herramientasMcp(ctx).map((x) => x.nombre);
    expect(nombres).not.toContain("core_aprobaciones_aprobar");
    expect(nombres).not.toContain("core_apikeys_set_autonomia");
    expect(await codigo(ctx, "core.apikeys.update", { id: KEY, presupuestoMensualUsd: 999 })).toBe(
      "FORBIDDEN",
    );
  });
});

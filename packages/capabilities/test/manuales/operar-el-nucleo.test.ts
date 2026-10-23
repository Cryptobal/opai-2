// Escenario determinista del manual docs/2.0/agentes/operar-el-nucleo.md (ADR-034): la misma
// secuencia de herramientas MCP que describe, contra el contexto de prueba. Si una herramienta
// nombrada en el manual no existe o cambia de forma, falla.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

import { MANUALES } from "../../src";
import { ejecutarHerramienta, herramientasMcp } from "../../src/mcp";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../../src/testing";
import type { Contexto } from "../../src/types";
import { reiniciar } from "../maestros-ayuda";
import { semillaTenant } from "../semilla";

beforeEach(reiniciar);

const RUTA = new URL("../../../../docs/2.0/agentes/operar-el-nucleo.md", import.meta.url);
const KEY = "0192f3a0-0000-7000-8000-00000000c0de";

function agente() {
  const semilla = {
    ...semillaTenant(),
    apiKey: [{ id: KEY, nombre: "Agente", userId: USUARIO_DE_PRUEBA.id, scopes: ["*"] }],
  };
  return contextoDePrueba({
    semilla,
    actor: { tipo: "agent", id: KEY, viaUserId: USUARIO_DE_PRUEBA.id },
    scopes: ["*"],
    agente: { apiKeyId: KEY, nombre: "Agente", presupuestoMensualMicro: null, autonomia: {} },
  });
}

async function usar(ctx: Contexto, nombre: string, args: unknown) {
  const h = herramientasMcp(ctx).find((x) => x.nombre === nombre);
  if (!h) throw new Error(`El manual nombra "${nombre}" y no existe para el agente.`);
  return ejecutarHerramienta(ctx, h, args);
}

describe("manual operar-el-nucleo", () => {
  it("la copia servida por MCP es idéntica al documento", () => {
    expect(MANUALES[0].texto).toBe(readFileSync(RUTA, "utf8"));
  });

  it("toda herramienta nombrada en el manual existe para un agente con scope total", () => {
    const { ctx } = agente();
    const nombradas = [
      ...readFileSync(RUTA, "utf8").matchAll(/`((?:preview_)?core_[a-z_]+)`/g),
    ].map((m) => m[1] ?? "");
    const disponibles = new Set(herramientasMcp(ctx).map((h) => h.nombre));
    expect(nombradas.length).toBeGreaterThan(10);
    expect(nombradas.filter((n) => !disponibles.has(n))).toEqual([]);
  });

  it("recorre la secuencia del manual", async () => {
    const { ctx, tabla } = agente();
    expect(await usar(ctx, "core_me", {})).toMatchObject({
      ok: true,
      data: { agente: { nombre: "Agente" } },
    });
    expect(await usar(ctx, "core_cuentas_list", {})).toMatchObject({
      ok: true,
      data: { items: [] },
    });
    const cuenta = { nombre: "Logística Andina", rut: "76.543.210-3" };
    expect(await usar(ctx, "preview_core_cuentas_create", cuenta)).toMatchObject({
      ok: true,
      dryRun: true,
    });
    const creada = await usar(ctx, "core_cuentas_create", {
      ...cuenta,
      idempotency_key: "manual-cuenta-001",
    });
    const otra = await usar(ctx, "core_cuentas_create", {
      ...cuenta,
      idempotency_key: "manual-cuenta-001",
    });
    expect(otra).toMatchObject({ ok: true, repetida: true });
    expect(tabla("cuenta")).toHaveLength(1);
    const cuentaId = creada.ok ? (creada.data as { id: string }).id : "";
    const subida = await usar(ctx, "core_documentos_iniciar_subida", {
      entidad: { tipo: "cuenta", id: cuentaId },
      nombre: "contrato.pdf",
      mime: "application/pdf",
      tamano: 1000,
      sha256: "d".repeat(64),
    });
    expect(subida).toMatchObject({ ok: true, data: { subida: { url: expect.any(String) } } });
    expect(await usar(ctx, "core_config_get", { modulo: "core" })).toMatchObject({ ok: true });
    const persona = await usar(ctx, "core_cargos_create", { nombre: "Guardia" });
    const cargo = persona.ok ? (persona.data as { id: string }).id : "";
    const p = await usar(ctx, "core_personas_create", {
      nombres: "Ana",
      apellidos: "Rojas",
      rut: "19.876.543-0",
      vinculo: { cargoId: cargo, tipo: "indefinido", inicio: "2025-01-02" },
    });
    const vinculo = p.ok ? (p.data as { vinculoVigente: { id: string } }).vinculoVigente.id : "";
    const irreversible = await usar(ctx, "core_vinculos_terminar", {
      id: vinculo,
      termino: "2026-10-31",
      motivo: "Renuncia voluntaria",
    });
    expect(irreversible).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
    const aprobacionId = irreversible.ok ? "" : (irreversible.error.aprobacionId ?? "");
    expect(await usar(ctx, "core_aprobaciones_get", { id: aprobacionId })).toMatchObject({
      ok: true,
      data: { estado: "pendiente" },
    });
  });
});

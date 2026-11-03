import { beforeAll, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { herramientasMcp, nombreHerramienta } from "../src/mcp";
import { limpiarModulos, limpiarRegistro, registrarCapacidades, registrarModulos } from "../src";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { modulos } from "../../../modules/registry/src";
import { capacidadesBancos } from "../../../modules/finanzas/capacidades/bancos";

const agente = { tipo: "agent" as const, id: "k-bancos", viaUserId: USUARIO_DE_PRUEBA.id };

const HERRAMIENTAS_BANCOS = [
  "finanzas_bancos_listar",
  "finanzas_bancos_guardar",
  "preview_finanzas_bancos_guardar",
  "finanzas_bancos_saldo_sugerido",
  "finanzas_cartolas_importar",
  "preview_finanzas_cartolas_importar",
  "finanzas_movimientos_bancarios_listar",
  "finanzas_conciliaciones_sugerir",
  "finanzas_conciliaciones_confirmar",
  "preview_finanzas_conciliaciones_confirmar",
  "finanzas_conciliaciones_deshacer",
  "preview_finanzas_conciliaciones_deshacer",
  "finanzas_reglas_banco_listar",
  "finanzas_reglas_banco_guardar",
  "preview_finanzas_reglas_banco_guardar",
] as const;

beforeAll(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos(modulos);
});

describe("MCP · capacidades de Bancos (CAR-97)", () => {
  it("cada capacidad de bancos del módulo finanzas tiene herramienta MCP con finanzas activo", () => {
    const ctx = contextoDePrueba({
      rol: "owner",
      actor: agente,
      scopes: ["*", "finanzas"],
      modulosActivos: ["finanzas"],
    }).ctx;
    const nombres = new Set(herramientasMcp(ctx).map((h) => h.nombre));
    for (const c of capacidadesBancos) {
      expect(nombres.has(nombreHerramienta(c.id)), c.id).toBe(true);
    }
  });

  it("expone las herramientas de cuentas, cartola, movimientos y conciliación", () => {
    const ctx = contextoDePrueba({
      rol: "owner",
      actor: agente,
      scopes: ["*"],
      modulosActivos: ["finanzas"],
    }).ctx;
    const nombres = herramientasMcp(ctx).map((h) => h.nombre);
    for (const h of HERRAMIENTAS_BANCOS) {
      expect(nombres, h).toContain(h);
    }
  });

  it("sin módulo finanzas activo no lista herramientas de bancos aunque el scope sea *", () => {
    const ctx = contextoDePrueba({
      rol: "owner",
      actor: agente,
      scopes: ["*"],
      modulosActivos: ["comercial"],
    }).ctx;
    const bancos = herramientasMcp(ctx).filter((h) => h.capacidad.id.startsWith("finanzas.bancos"));
    expect(bancos).toEqual([]);
  });

  it("sin scope finanzas no lista herramientas de bancos aunque el módulo esté activo", () => {
    const ctx = contextoDePrueba({
      rol: "owner",
      actor: agente,
      scopes: ["core"],
      modulosActivos: ["finanzas"],
    }).ctx;
    const bancos = herramientasMcp(ctx).filter((h) =>
      h.capacidad.id.startsWith("finanzas."),
    );
    expect(bancos).toEqual([]);
  });
});

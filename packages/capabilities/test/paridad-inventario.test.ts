import { beforeAll, describe, expect, it } from "vitest";

import { modulos } from "../../../modules/registry/src";
import { capacidadesDelNucleo } from "../src/core";
import { limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { ENTRADAS_SERVIDOR } from "./paridad-entradas";
import { entradasDeServidor, inventario } from "./paridad-inventario";
import { inventarioMarkdown } from "./paridad-inventario-md";

// Gate de ADR-055 (regla de Carlos del 28-oct-2026): ninguna acción de pantalla sin su herramienta
// MCP equivalente, salvo las excepciones con motivo de `paridad-excepciones.ts`.
beforeAll(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
  limpiarModulos();
  registrarModulos(modulos);
});

describe("paridad pantalla ↔ MCP (ADR-055)", () => {
  it("toda capacidad que invoca una pantalla tiene herramienta MCP o una excepción justificada", () => {
    const faltan = inventario().filter((f) => f.estado === "falta");
    expect(
      faltan.map((f) => `${f.portal} ${f.ruta}: ${f.capacidad}`),
      "Agrega la herramienta MCP (capacidad no interna) o una excepción con motivo en paridad-excepciones.ts",
    ).toEqual([]);
  });

  it("el inventario no pasa en vacío y cubre Plataforma", () => {
    const filas = inventario();
    expect(filas.length).toBeGreaterThan(100);
    expect(filas.some((f) => f.portal === "platform" && f.estado === "existe")).toBe(true);
  });

  it("toda acción de servidor y ruta de apps/web está declarada con su motivo", () => {
    expect(
      entradasDeServidor(),
      "Entrada de servidor nueva: invoca una capacidad o declárala con motivo en paridad-entradas.ts",
    ).toEqual(Object.keys(ENTRADAS_SERVIDOR).sort());
    for (const [e, motivo] of Object.entries(ENTRADAS_SERVIDOR))
      expect(motivo.length, `${e} sin motivo`).toBeGreaterThan(20);
  });

  it("el inventario de docs/2.0/paridad está al día", async () => {
    await expect(inventarioMarkdown()).toMatchFileSnapshot(
      "../../../docs/2.0/paridad/mcp-inventario.md",
    );
  });
});

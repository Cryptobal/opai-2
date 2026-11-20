import { describe, expect, it } from "vitest";

import { destinosComprasQa, nombreComprasQa } from "./compras-qa-destinos-ci";

const origen = "postgresql://postgres:compras-0-0@127.0.0.1:55432/opai_e2e_compras_template";
const nombre = nombreComprasQa("00000000-0000-4000-8000-000000000001");

describe("destinos sintéticos de compras", () => {
  it("conserva el servicio dedicado y separa catálogo y base del caso", () => {
    const destinos = destinosComprasQa(origen, nombre);
    expect(new URL(destinos.catalogo).pathname).toBe("/postgres");
    expect(new URL(destinos.caso).pathname).toBe(`/${nombre}`);
    expect(new URL(destinos.caso).host).toBe(new URL(origen).host);
    expect(new URL(destinos.caso).port).toBe("55432");
  });
  it.each([
    "postgresql://postgres:compras-0-0@127.0.0.1:5432/opai_e2e_compras_template",
    "postgresql://postgres:compras-0-0@127.0.0.1:55432/opai_test",
    "postgresql://postgres:compras-0-0@localhost:55432/opai_e2e_compras_template",
    `${origen}?application_name=ficticio`,
    `${origen}#ficticio`,
    "destino-inválido-ficticio",
    origen.replace(":compras-0-0", ""),
    origen.replace("postgres:compras-0-0@", ""),
    origen.replace("postgres:compras-0-0@", "otro:compras-0-0@"),
    `${origen}?`,
    `${origen}#`,
  ])("rechaza un destino no autorizado", (url) => {
    const error = (() => {
      try { destinosComprasQa(url, nombre); } catch (e) { return e; }
    })();
    expect(error).toHaveProperty("message", "La suite de compras requiere su servicio de CI dedicado.");
    expect(error).not.toHaveProperty("input");
    expect(error).not.toHaveProperty("cause");
  });
  it("no acepta nombres de base que el helper no puede haber generado", () => {
    expect(() => destinosComprasQa(origen, "opai_test")).toThrow("servicio de CI dedicado");
  });
});

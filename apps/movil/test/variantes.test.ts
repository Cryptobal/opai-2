import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { configuracion, elegir, ENTORNOS, VARIANTES } from "../src/variantes";

describe("apps nativas (Brief 17)", () => {
  it("sin variables prepara OPAI contra test.opai.cl, nunca producción", () => {
    expect(elegir({})).toEqual({ variante: "opai", entorno: "test" });
    expect(configuracion("opai", "test").server?.url).toBe("https://test.opai.cl/entrar");
  });

  it("las dos variantes abren /entrar, que lleva a cada perfil a su portal", () => {
    for (const variante of ["opai", "terreno"] as const) {
      const config = configuracion(variante, "produccion");
      expect(config.server?.url).toBe("https://app.opai.cl/entrar");
      expect(config.appId).toBe(VARIANTES[variante].appId);
    }
  });

  it("cada variante tiene su identificador de tienda y su carpeta nativa", () => {
    const terreno = configuracion("terreno", "test");
    expect(terreno.appName).toBe("OPAI Terreno");
    expect(terreno.android?.path).toBe("nativo/terreno/android");
    expect(terreno.ios?.path).toBe("nativo/terreno/ios");
    expect(new Set(Object.values(VARIANTES).map((v) => v.appId)).size).toBe(2);
  });

  it("solo navega dentro de OPAI y sin tráfico en claro", () => {
    for (const entorno of Object.keys(ENTORNOS) as (keyof typeof ENTORNOS)[]) {
      const { server, android } = configuracion("opai", entorno);
      expect(server?.allowNavigation).toEqual([new URL(ENTORNOS[entorno]).hostname]);
      expect(server?.cleartext).toBe(false);
      expect(android?.allowMixedContent).toBe(false);
      expect(server?.url?.startsWith("https://")).toBe(true);
    }
  });

  it("se identifica en el user agent para que la web sepa que está dentro de la app", () => {
    expect(configuracion("terreno", "test").appendUserAgent).toBe("OPAIApp/terreno");
  });

  it("rechaza una variante o un entorno desconocidos", () => {
    expect(() => elegir({ OPAI_APP: "otra" })).toThrow(/OPAI_APP/);
    expect(() => elegir({ OPAI_APP_ENTORNO: "staging" })).toThrow(/OPAI_APP_ENTORNO/);
  });

  it("la página sin conexión existe y no carga nada de fuera", () => {
    const html = readFileSync(new URL("../www/sin-conexion.html", import.meta.url), "utf8");
    expect(html).toContain("No pudimos abrir OPAI");
    expect(html).not.toMatch(/https?:\/\//);
  });
});

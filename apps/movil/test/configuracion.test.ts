import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { configuracion, elegirEntorno, ENTORNOS } from "../src/configuracion";

describe("app nativa OPAI (Brief 17)", () => {
  it("sin variables prepara OPAI contra test.opai.cl, nunca producción", () => {
    expect(elegirEntorno({})).toBe("test");
    expect(configuracion("test").server?.url).toBe("https://test.opai.cl/entrar");
  });

  it("es una sola app, «OPAI», que abre /entrar para que cada perfil caiga en su portal", () => {
    const config = configuracion("produccion");
    expect(config.appId).toBe("cl.opai.app");
    expect(config.appName).toBe("OPAI");
    expect(config.server?.url).toBe("https://app.opai.cl/entrar");
  });

  it("solo navega dentro de OPAI y sin tráfico en claro", () => {
    for (const entorno of Object.keys(ENTORNOS) as (keyof typeof ENTORNOS)[]) {
      const { server, android } = configuracion(entorno);
      expect(server?.allowNavigation).toEqual([new URL(ENTORNOS[entorno]).hostname]);
      expect(server?.cleartext).toBe(false);
      expect(android?.allowMixedContent).toBe(false);
    }
  });

  it("se identifica en el user agent para que la web sepa que está dentro de la app", () => {
    expect(configuracion("test").appendUserAgent).toBe("OPAIApp/opai");
  });

  it("rechaza un entorno desconocido", () => {
    expect(() => elegirEntorno({ OPAI_APP_ENTORNO: "staging" })).toThrow(/OPAI_APP_ENTORNO/);
  });

  it("la página sin conexión existe y no carga nada de fuera", () => {
    const html = readFileSync(new URL("../www/sin-conexion.html", import.meta.url), "utf8");
    expect(html).toContain("No pudimos abrir OPAI");
    expect(html).not.toMatch(/https?:\/\//);
  });
});

import { describe, expect, it } from "vitest";

import { ipInterna, problemaUrlWebhook } from "./url";

describe("dirección de un destino de eventos (CAR-352)", () => {
  it("acepta https a un dominio público", () => {
    expect(problemaUrlWebhook("https://hooks.ejemplo.cl/opai")).toBeNull();
    expect(problemaUrlWebhook("https://api.ejemplo.com:8443/x?y=1")).toBeNull();
  });

  it("rechaza lo que no es https", () => {
    expect(problemaUrlWebhook("http://hooks.ejemplo.cl")).toMatch(/https/);
    expect(problemaUrlWebhook("ftp://hooks.ejemplo.cl")).toMatch(/https/);
    expect(problemaUrlWebhook("no es una url")).toMatch(/válida/);
  });

  it("rechaza credenciales y fragmentos en la dirección", () => {
    expect(problemaUrlWebhook("https://u:p@hooks.ejemplo.cl")).toMatch(/usuario/);
    expect(problemaUrlWebhook("https://hooks.ejemplo.cl/#x")).toMatch(/fragmento/);
  });

  it("rechaza la red interna, también escrita de formas raras", () => {
    for (const url of [
      "https://localhost/x",
      "https://servidor/x",
      "https://db.internal/x",
      "https://127.0.0.1/x",
      "https://2130706433/x",
      "https://0x7f.0.0.1/x",
      "https://10.1.2.3/x",
      "https://172.20.0.1/x",
      "https://192.168.1.1/x",
      "https://169.254.169.254/latest",
      "https://[::1]/x",
      "https://[fd00::1]/x",
      "https://[::ffff:10.0.0.1]/x",
    ]) {
      expect(problemaUrlWebhook(url), url).not.toBeNull();
    }
  });

  it("clasifica IP públicas e internas", () => {
    expect(ipInterna("8.8.8.8")).toBe(false);
    expect(ipInterna("100.64.0.1")).toBe(true);
    expect(ipInterna("2001:4860:4860::8888")).toBe(false);
    expect(ipInterna("fe80::1")).toBe(true);
  });

  it("rechaza direcciones demasiado largas", () => {
    expect(problemaUrlWebhook(`https://a.cl/${"x".repeat(2100)}`)).toMatch(/larga/);
  });
});

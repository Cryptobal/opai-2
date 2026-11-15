import { describe, expect, it } from "vitest";

import { ipInterna, normalizarUrlWebhook, problemaUrlWebhook } from "./url";

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
      "https://[::127.0.0.1]/x",
      "https://[::a9fe:a9fe]/x",
      "https://[64:ff9b::169.254.169.254]/x",
      "https://[2002:a9fe:a9fe::]/x",
      "https://[::ffff:0:127.0.0.1]/x",
      "https://[fec0::1]/x",
      "https://[ff02::1]/x",
      "https://[2001:db8::1]/x",
      "https://[2001:0:4136:e378::1]/x",
      "https://localhost../x",
      "https://metadata.google.internal../x",
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

  it("guarda la dirección en su forma canónica", () => {
    expect(normalizarUrlWebhook(" HTTPS://Hooks.Ejemplo.CL/Ruta?x=1 ")).toBe(
      "https://hooks.ejemplo.cl/Ruta?x=1",
    );
  });
});

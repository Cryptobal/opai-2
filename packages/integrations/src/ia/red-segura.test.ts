import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorIa } from "./http";
import { proveedorIa } from "./proveedores";
import { baseUrlEsPublica, exigirDestinoPublico, ipInterna } from "./red-segura";

describe("defensa SSRF del baseUrl de IA (ADR-027, ADR-049)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ipInterna reconoce privadas, loopback, link-local, metadata y ULA", () => {
    for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "100.64.0.1", "::1", "fe80::1", "fd00::1", "::ffff:10.0.0.1"])
      expect(ipInterna(ip)).toBe(true);
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700::1111"])
      expect(ipInterna(ip)).toBe(false);
  });

  it("baseUrlEsPublica exige https y rechaza hosts internos evidentes", () => {
    expect(baseUrlEsPublica("https://api.openai.com/v1")).toBe(true);
    expect(baseUrlEsPublica("https://gateway.ai.vercel.app/v1")).toBe(true);
    expect(baseUrlEsPublica("http://api.openai.com/v1")).toBe(false); // no https
    expect(baseUrlEsPublica("https://localhost/v1")).toBe(false);
    expect(baseUrlEsPublica("https://127.0.0.1/v1")).toBe(false);
    expect(baseUrlEsPublica("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(baseUrlEsPublica("https://10.1.2.3/v1")).toBe(false);
    expect(baseUrlEsPublica("https://[::1]/v1")).toBe(false);
    expect(baseUrlEsPublica("https://x.internal/v1")).toBe(false);
    expect(baseUrlEsPublica("no es una url")).toBe(false);
  });

  it("exigirDestinoPublico rechaza un host que resuelve a una IP interna (anti rebinding)", async () => {
    const aInterno = async () => ["10.0.0.5"];
    await expect(exigirDestinoPublico("https://rebind.example/v1", "OpenAI", aInterno)).rejects.toMatchObject({
      name: "ErrorIa",
    });
    const aPublico = async () => ["8.8.8.8"];
    await expect(exigirDestinoPublico("https://ok.example/v1", "OpenAI", aPublico)).resolves.toBeUndefined();
  });

  it("exigirDestinoPublico no filtra la key y exige https antes de resolver", async () => {
    const e = await exigirDestinoPublico("http://api.openai.com/v1", "OpenAI").catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErrorIa);
    expect(String((e as ErrorIa).message)).toMatch(/https/);
  });

  it("ia_compatible con base URL interna falla antes de hacer fetch y sin filtrar la key", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const prov = proveedorIa("ia_compatible", "sk-secreta-123", { baseUrl: "https://10.0.0.1/v1" });
    const e = await prov.conversar("m", { mensajes: [{ rol: "usuario", texto: "x" }] }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErrorIa);
    expect(String((e as ErrorIa).message)).not.toContain("sk-secreta-123");
    expect(f).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it } from "vitest";

import { destinoSeguro } from "@/app/(auth)/destino";
import { bloqueado, limpiarVentanas, olvidar, registrarFallo } from "@/lib/rate-limit";

describe("destinoSeguro", () => {
  it("acepta rutas internas con query y hash", () => {
    expect(destinoSeguro("/crm/cuentas?x=1#a")).toBe("/crm/cuentas?x=1#a");
    expect(destinoSeguro(["/a", "/b"])).toBe("/a");
  });

  it.each([
    undefined,
    "",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "\\\\evil.com",
    "/\tevil.com",
    "/\n/evil.com",
    "javascript:alert(1)",
    "evil.com",
  ])("rechaza %j", (valor) => {
    expect(destinoSeguro(valor)).toBe("/");
  });
});

describe("límite de fallos de login", () => {
  afterEach(() => limpiarVentanas());

  it("bloquea solo al acumular fallos y se limpia con un éxito", () => {
    const ventana = 15 * 60_000;
    for (let i = 0; i < 4; i++) registrarFallo("login-email:a@b.cl", ventana, 1000);
    expect(bloqueado("login-email:a@b.cl", 5, ventana, 1000)).toBe(false);
    registrarFallo("login-email:a@b.cl", ventana, 1000);
    expect(bloqueado("login-email:a@b.cl", 5, ventana, 1000)).toBe(true);
    expect(bloqueado("login-email:a@b.cl", 5, ventana, 1000 + ventana)).toBe(false);
    olvidar("login-email:a@b.cl");
    expect(bloqueado("login-email:a@b.cl", 5, ventana, 1000)).toBe(false);
  });

  it("consultar no cuenta como intento", () => {
    for (let i = 0; i < 50; i++) expect(bloqueado("login-ip:1.2.3.4", 30, 60_000, 0)).toBe(false);
  });
});

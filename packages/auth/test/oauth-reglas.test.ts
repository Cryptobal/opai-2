import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  ALCANCES_OAUTH,
  empresaDelConsentimiento,
  estadoTokenOAuth,
  hashTokenOAuth,
  necesitaElegirEmpresa,
} from "../src/oauth-reglas";

const A = "01a00000-0000-7000-8000-00000000000a";
const B = "01a00000-0000-7000-8000-00000000000b";
const activa = (tenantId: string) => ({ tenantId, estado: "activa", tenantEstado: "activo" });
const AHORA = new Date("2026-11-12T12:00:00Z");

describe("OAuth del MCP · empresa del token (CAR-247)", () => {
  it("con una sola empresa usable no hay nada que elegir", () => {
    expect(necesitaElegirEmpresa([activa(A)], null)).toBe(false);
    expect(empresaDelConsentimiento([activa(A)], null)).toBe(A);
  });
  it("con varias, pide elegir hasta que la sesión tenga una de las suyas", () => {
    expect(necesitaElegirEmpresa([activa(A), activa(B)], null)).toBe(true);
    expect(necesitaElegirEmpresa([activa(A), activa(B)], B)).toBe(false);
    expect(empresaDelConsentimiento([activa(A), activa(B)], B)).toBe(B);
  });
  it("una empresa ajena, suspendida o con membresía inactiva nunca queda en el token", () => {
    const ajena = "01a00000-0000-7000-8000-0000000000ff";
    expect(necesitaElegirEmpresa([activa(A), activa(B)], ajena)).toBe(true);
    expect(() => empresaDelConsentimiento([activa(A), activa(B)], ajena)).toThrow();
    const suspendida = { tenantId: B, estado: "activa", tenantEstado: "suspendido" };
    expect(() => empresaDelConsentimiento([activa(A), suspendida], B)).toThrow();
    const inactiva = { tenantId: B, estado: "suspendida", tenantEstado: "activo" };
    expect(() => empresaDelConsentimiento([activa(A), inactiva], B)).toThrow();
  });
  it("sin empresas usables no se puede autorizar", () => {
    expect(() => empresaDelConsentimiento([], null)).toThrow();
  });
});

describe("OAuth del MCP · token", () => {
  it("el hash es el mismo que guarda el proveedor: SHA-256 en base64url sin relleno", () => {
    const esperado = createHash("sha256").update("tok-123").digest("base64url");
    expect(hashTokenOAuth("tok-123")).toBe(esperado);
  });
  it("vigente solo si no venció, no fue revocado y el cliente está activo", () => {
    const base = {
      expiresAt: new Date("2026-11-12T13:00:00Z"),
      revoked: null,
      clienteActivo: true,
    };
    expect(estadoTokenOAuth(base, AHORA)).toBe("vigente");
    expect(estadoTokenOAuth({ ...base, expiresAt: new Date("2026-11-12T11:59:59Z") }, AHORA)).toBe(
      "vencido",
    );
    expect(estadoTokenOAuth({ ...base, revoked: AHORA }, AHORA)).toBe("revocado");
    expect(estadoTokenOAuth({ ...base, clienteActivo: false }, AHORA)).toBe("revocado");
  });
  it("los alcances ofrecidos nunca incluyen plataforma", () => {
    expect(ALCANCES_OAUTH).toEqual(["mcp:leer", "mcp:escribir", "offline_access"]);
    expect(ALCANCES_OAUTH.some((a) => a.includes("platform"))).toBe(false);
  });
});

describe("consultaParaAutorizar", () => {
  it("quita la firma y los parámetros internos y conserva la petición de la app", async () => {
    const { consultaParaAutorizar } = await import("../src/oauth-reglas");
    const q =
      "client_id=c1&redirect_uri=https%3A%2F%2Fclaude.ai%2Fcb&scope=mcp%3Aleer&state=s&code_challenge=x" +
      "&code_challenge_method=S256&exp=9&ba_iat=1&ba_pl=ses&ba_param=client_id&ba_param=exp&sig=abc";
    const r = new URLSearchParams(consultaParaAutorizar(q));
    expect([...r.keys()].sort()).toEqual(
      ["client_id", "code_challenge", "code_challenge_method", "redirect_uri", "scope", "state"].sort(),
    );
    expect(r.get("redirect_uri")).toBe("https://claude.ai/cb");
  });
});

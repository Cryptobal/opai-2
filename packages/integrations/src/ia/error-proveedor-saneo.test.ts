import { describe, expect, it } from "vitest";

import { sanear } from "./error-proveedor";

const KEY = "sk-ant-api03-SECRETA-de-prueba-0123456789";

describe("sanear: formas de credencial que antes sobrevivían (no bloqueante del Revisor, #100)", () => {
  it("quita la key aunque venga URL-encoded, en mayúsculas, partida o con invisibles", () => {
    const casos = [
      encodeURIComponent(`clave=${KEY}`),
      KEY.toUpperCase(),
      `${KEY.slice(0, 12)} ${KEY.slice(12)}`,
      `${KEY.slice(0, 12)}\n${KEY.slice(12)}`,
      `${KEY.slice(0, 12)}\u200b${KEY.slice(12)}`,
      `${KEY.slice(0, 12)}\u00ad${KEY.slice(12)}`,
    ];
    for (const caso of casos) {
      const limpio = sanear(`invalid key ${caso} fin`, KEY);
      expect(limpio).not.toMatch(/SECRETA/i);
      expect(limpio).not.toMatch(/0123456789/);
      expect(limpio).toContain("[clave]");
    }
  });

  it("quita Basic, base64 largos, tokens de otros proveedores, usuario:clave@ y la query", () => {
    const b64 = Buffer.from("usuario:una-clave-bastante-larga-123456").toString("base64");
    expect(sanear(`Authorization: Basic ${b64}`)).toBe("Authorization: [clave]");
    expect(sanear(`token ${b64} fin`)).toBe("token [clave] fin");
    expect(sanear("ghp_abcdefghijklmnopqrstuvwx y gsk_ABCDEFGHIJKLMNOPQRSTUV")).toBe(
      "[clave] y [clave]",
    );
    expect(sanear("github_pat_11ABCDEFG0123456789_abcdefghij")).toBe("[clave]");
    expect(sanear("falló https://admin:s3cr3t@proxy.ejemplo.cl/v1")).toBe(
      "falló https://[clave]@proxy.ejemplo.cl/v1",
    );
    expect(sanear("GET /v1/models?key=AbC123&alt=json y ?api_key=zzz")).toBe(
      "GET /v1/models?key=[clave]&alt=json y ?api_key=[clave]",
    );
  });

  it("no toca un mensaje normal del proveedor ni un % suelto", () => {
    const normal = "invalid_request_error · max_tokens: 100% of the limit (model claude-haiku-5-5)";
    expect(sanear(normal, KEY)).toBe(normal);
    expect(sanear("Your credit balance is too low.", KEY)).toBe("Your credit balance is too low.");
    for (const texto of [
      "Your basic tier quota exceeded",
      "Basic plan",
      "risk-assessment-pipeline-failed",
    ])
      expect(sanear(texto, KEY)).toBe(texto);
  });
});

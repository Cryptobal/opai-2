import { randomBytes } from "node:crypto";

import { betterAuth } from "better-auth";
import { describe, expect, it } from "vitest";

import { origenBaseConfiable, origenesConfiables } from "../src/opciones";

const OFICIALES = ["https://app.opai.cl", "https://test.opai.cl"];

describe("orígenes confiables del login", () => {
  it("admite los dos HTTPS de OPAI y conserva la URL base configurada si es oficial", () => {
    const env = { NODE_ENV: "production", BETTER_AUTH_URL: "https://test.opai.cl/" };
    expect(origenesConfiables(env)).toEqual(OFICIALES);
    expect(origenBaseConfiable(env)).toBe("https://test.opai.cl");
  });

  it("admite solo localhost:3000 además de los orígenes oficiales fuera de producción", () => {
    const env = { NODE_ENV: "development", BETTER_AUTH_URL: "http://localhost:3000/api/auth" };
    expect(origenesConfiables(env)).toEqual([...OFICIALES, "http://localhost:3000"]);
    expect(origenBaseConfiable(env)).toBe("http://localhost:3000");
    expect(origenesConfiables({ ...env, BETTER_AUTH_URL: "http://localhost:4000" })).toEqual(
      [...OFICIALES, "http://localhost:3000"],
    );
  });

  it.each([
    ["https://sitio-ajeno.example", "https://sitio-ajeno.example"],
    ["http://app.opai.cl", "http://app.opai.cl"],
    ["https://app.opai.cl:8443", "https://app.opai.cl:8443"],
    ["https://*.vercel.app", "https://preview-ajena.vercel.app"],
    ["http://localhost:3000", "http://localhost:3000"],
  ])("no confía en %s aunque BETTER_AUTH_URL lo declare en producción", async (configurada, origen) => {
    const env = { NODE_ENV: "production", BETTER_AUTH_URL: configurada };
    expect(origenesConfiables(env)).toEqual(OFICIALES);
    expect(origenBaseConfiable(env)).toBe("https://app.opai.cl");

    const auth = betterAuth({
      baseURL: origenBaseConfiable(env),
      trustedOrigins: origenesConfiables(env),
      secret: randomBytes(32).toString("hex"),
      telemetry: { enabled: false },
    });
    const contexto = await auth.$context;
    expect(contexto.isTrustedOrigin(origen)).toBe(false);
    for (const oficial of OFICIALES) expect(contexto.isTrustedOrigin(oficial)).toBe(true);
  });
});

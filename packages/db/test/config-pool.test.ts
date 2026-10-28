import { describe, expect, it, vi } from "vitest";

import { configPool } from "../src/config-pool";

const url = "postgresql://app:password@ep-test-pooler.us-east-1.aws.neon.tech/db";

describe("pool por instancia", () => {
  it("usa valores por defecto y keepalive", () => {
    expect(configPool({}, url, true)).toEqual({
      max: 4,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
    });
  });
  it("lee las variables y rechaza valores inválidos", () => {
    expect(
      configPool(
        {
          DATABASE_POOL_MAX: "3",
          DATABASE_POOL_IDLE_TIMEOUT_MS: "5000",
          DATABASE_POOL_CONNECTION_TIMEOUT_MS: "2000",
        },
        url,
        true,
      ),
    ).toMatchObject({ max: 3, idleTimeoutMillis: 5000, connectionTimeoutMillis: 2000 });
    expect(() => configPool({ DATABASE_POOL_MAX: "0" }, url, true)).toThrow();
    expect(() => configPool({ DATABASE_POOL_MAX: "2x" }, url, true)).toThrow();
  });
  it("avisa una sola vez si el host no tiene pooler, sin interrumpir la configuración", () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => configPool({ VERCEL: "1" }, url, true)).not.toThrow();
    expect(() =>
      configPool({ VERCEL: "1" }, "postgresql://falso-pooler.example.com/db", true),
    ).not.toThrow();
    expect(() => configPool({ VERCEL: "1" }, "postgresql://localhost/db", false)).not.toThrow();
    expect(aviso).not.toHaveBeenCalled();
    expect(() => configPool({ VERCEL: "1" }, "url inválida", true)).not.toThrow();
    expect(() => configPool({ VERCEL: "1" }, "postgresql://localhost/db", true)).not.toThrow();
    expect(aviso).toHaveBeenCalledOnce();
    expect(aviso).toHaveBeenCalledWith("DATABASE_URL en Vercel: host sin -pooler.");
    aviso.mockRestore();
  });
});

import { describe, expect, it } from "vitest";

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
  it("exige pooler para la aplicación en Vercel", () => {
    expect(() => configPool({ VERCEL: "1" }, url, true)).not.toThrow();
    expect(() => configPool({ VERCEL: "1" }, "postgresql://localhost/db", true)).toThrow();
    expect(() =>
      configPool({ VERCEL: "1" }, "postgresql://falso-pooler.example.com/db", true),
    ).toThrow();
    expect(() => configPool({ VERCEL: "1" }, "postgresql://localhost/db", false)).not.toThrow();
  });
});

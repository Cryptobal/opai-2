import { describe, expect, it, vi } from "vitest";

import { configPool, configTransaccion, conSslVerificado } from "../src/config-pool";

const url = "postgresql://app:password@ep-test-pooler.us-east-1.aws.neon.tech/db";

describe("pool por instancia", () => {
  it("usa valores por defecto y keepalive", () => {
    expect(configPool({}, url, true)).toEqual({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
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
  it("fija sslmode=verify-full donde pg ya lo aplicaba como alias, sin el SECURITY WARNING", () => {
    const neon = "postgresql://app:pw@ep-x-pooler.sa-east-1.aws.neon.tech/db";
    for (const modo of ["require", "prefer", "verify-ca"]) {
      const nueva = new URL(conSslVerificado(`${neon}?sslmode=${modo}&channel_binding=require`));
      expect(nueva.searchParams.get("sslmode")).toBe("verify-full");
      expect(nueva.searchParams.get("channel_binding")).toBe("require");
      expect(nueva.password).toBe("pw");
    }
    expect(configPool({}, `${neon}?sslmode=require`, true).connectionString).toContain(
      "sslmode=verify-full",
    );
  });
  it("no altera una contraseña con %, @, # u otros caracteres codificados al reescribir sslmode", () => {
    for (const clave of ["p%40ss%23w%25rd", "a%2Fb%3Fc%26d", "%C3%B1and%C3%BA%20x", "pw+1~!*"]) {
      const original = `postgresql://app:${clave}@ep-x-pooler.sa-east-1.aws.neon.tech/db?sslmode=require`;
      const nueva = conSslVerificado(original);
      expect(nueva).toBe(original.replace("sslmode=require", "sslmode=verify-full"));
      // Lo que pg lee de la URL (decodificado) es idéntico antes y después.
      expect(decodeURIComponent(new URL(nueva).password)).toBe(
        decodeURIComponent(new URL(original).password),
      );
      expect(new URL(nueva).username).toBe("app");
    }
  });
  it("opciones de transacción: defecto alineado al plazo del pool y variables válidas", () => {
    // Por defecto `maxWait` = `connectionTimeoutMillis` (10 s): Prisma no se corta antes que el pool.
    expect(configTransaccion({})).toEqual({ maxWait: 10000, timeout: 15000 });
    expect(
      configTransaccion({ DATABASE_TX_MAX_WAIT_MS: "8000", DATABASE_TX_TIMEOUT_MS: "20000" }),
    ).toEqual({ maxWait: 8000, timeout: 20000 });
    expect(() => configTransaccion({ DATABASE_TX_MAX_WAIT_MS: "0" })).toThrow();
    expect(() => configTransaccion({ DATABASE_TX_TIMEOUT_MS: "x" })).toThrow();
  });
  it("respeta disable, verify-full, uselibpqcompat y las URL sin sslmode", () => {
    for (const u of [
      "postgresql://localhost/db",
      "postgresql://localhost/db?sslmode=disable",
      "postgresql://h/db?sslmode=verify-full",
      "postgresql://h/db?uselibpqcompat=true&sslmode=require",
      "url inválida",
    ]) {
      expect(conSslVerificado(u)).toBe(u);
    }
  });
});

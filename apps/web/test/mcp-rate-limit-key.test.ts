import { generarApiKey } from "@opai/capabilities";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Fuentes } from "../lib/fuentes";
import { fuentesFalsas } from "./fuentes-falsas";

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
vi.stubEnv("BETTER_AUTH_SECRET", "secreto-de-prueba-de-al-menos-32-caracteres");

// Limitador en memoria con la misma semántica que `permitir` (una unidad por llamada y por clave),
// para ver qué clave consume cada request sin tocar la base.
const { cuentas, claves } = vi.hoisted(() => ({
  cuentas: new Map<string, number>(),
  claves: [] as string[],
}));
vi.mock("@/lib/rate-limit", () => ({
  permitir: async (clave: string, maximo: number) => {
    claves.push(clave);
    const n = (cuentas.get(clave) ?? 0) + 1;
    cuentas.set(clave, n);
    return n <= maximo;
  },
  ipDe: () => "1.2.3.4",
  LIMITES: { apiPorPrincipal: { maximo: 3, ventanaMs: 60_000 }, apiPorIp: { maximo: 1000, ventanaMs: 60_000 } },
}));

// Dos keys reales del mismo slug (`gard`), cada una con su fila.
const a = fuentesFalsas({ key: { id: "key-a" } });
const b = fuentesFalsas({ key: { id: "key-b" } });
const keyPorHash: Fuentes["keyPorHash"] = async (t, h) =>
  (await a.fuentes.keyPorHash(t, h)) ?? (await b.fuentes.keyPorHash(t, h));
vi.mock("../lib/fuentes", async (original) => ({
  ...(await original<object>()),
  fuentesReales: new Proxy({} as Fuentes, {
    get: (_t, k: keyof Fuentes) => (k === "keyPorHash" ? keyPorHash : a.fuentes[k]),
  }),
}));

async function listar(key: string): Promise<number> {
  const { manejarMcp } = await import("../lib/mcp");
  const res = await manejarMcp(
    new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    }),
    key,
  );
  return res.status;
}

beforeEach(() => {
  cuentas.clear();
  claves.length = 0;
});

describe("MCP: rate limit por key autenticada (CAR-44)", () => {
  it("dos keys del mismo slug tienen cupos separados: agotar una no frena a la otra", async () => {
    for (let i = 0; i < 3; i++) expect(await listar(a.secreto)).toBe(200);
    expect(await listar(a.secreto)).toBe(429);
    expect(await listar(b.secreto)).toBe(200);
  });

  it("keys falsas con el mismo prefijo que una real no consumen su cupo", async () => {
    const prefijo = a.secreto.slice(0, 24);
    for (let i = 0; i < 10; i++) {
      const falsa = prefijo + generarApiKey("gard").secreto.slice(prefijo.length);
      expect(await listar(falsa)).toBe(401);
    }
    expect(await listar(a.secreto)).toBe(200);
  });

  it("la clave del límite es el id de la key, nunca su texto ni un prefijo", async () => {
    await listar(a.secreto);
    expect(claves).toEqual(["mcp-ip:1.2.3.4", "mcp-key:key-a"]);
    expect(claves.join(" ")).not.toContain(a.secreto.slice(0, 12));
  });
});

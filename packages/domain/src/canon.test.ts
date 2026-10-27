import { describe, expect, it } from "vitest";

import {
  canonDeAuditoria,
  HASH_GENESIS,
  hashEncadenado,
  jsonCanonico,
  primeraRotura,
  sha256Hex,
} from "./canon";

describe("canon y cadena", () => {
  it("ordena claves, omite undefined y serializa fechas", () => {
    expect(jsonCanonico({ b: 1, a: { d: undefined, c: [2, undefined] }, f: new Date(0) })).toBe(
      '{"a":{"c":[2,null]},"b":1,"f":"1970-01-01T00:00:00.000Z"}',
    );
    expect(jsonCanonico({ x: 1, y: 2 })).toBe(jsonCanonico({ y: 2, x: 1 }));
  });
  it("sha256 conocido", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
  it("detecta la primera rotura de la cadena", async () => {
    const p1 = jsonCanonico({ n: 1 });
    const h1 = await hashEncadenado(HASH_GENESIS, p1);
    const p2 = jsonCanonico({ n: 2 });
    const h2 = await hashEncadenado(h1, p2);
    const cadena = [
      { seq: 1, payloadCanon: p1, hashPrevio: HASH_GENESIS, hash: h1 },
      { seq: 2, payloadCanon: p2, hashPrevio: h1, hash: h2 },
    ];
    expect(await primeraRotura(cadena)).toBeNull();
    expect(await primeraRotura([cadena[0]!, { ...cadena[1]!, payloadCanon: '{"n":3}' }])).toBe(2);
  });

  it("canonDeAuditoria no cambia si cambia el payload crudo con el mismo digest", async () => {
    const base = {
      tenantId: "t1",
      seq: 1,
      actorTipo: "user",
      actorId: "u1",
      viaUserId: null,
      capability: "core.cuentas.update",
      entityType: "cuenta",
      entityId: "c1",
      createdAt: new Date("2026-10-28T00:00:00.000Z"),
    };
    const a = await canonDeAuditoria({ ...base, payload: { nombre: "Ana" } });
    const b = await canonDeAuditoria({ ...base, payload: { nombre: "Ana" } });
    const c = await canonDeAuditoria({ ...base, payload: { nombre: "Otra" } });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toContain("payloadDigest");
    expect(a).not.toContain("Ana");
  });
});

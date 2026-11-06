import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { jsonCanonico } from "@opai/domain";

import { ocultarSensibles } from "../src/idempotencia-sensibles";

describe("huella de idempotencia con secretos (CAR-78 B1)", () => {
  const input = { personaId: "p-1", pin: "482915" };

  it("reemplaza el campo sensible: la huella no se invierte con un SHA-256 del PIN", () => {
    const oculto = ocultarSensibles(input, ["pin"]) as { personaId: string; pin: string };
    expect(oculto.personaId).toBe("p-1");
    expect(oculto.pin).toMatch(/^[0-9a-f]{64}$/);
    for (let n = 0; n < 1_000_000; n += 99_991) {
      const pin = String(n).padStart(6, "0");
      const sha = createHash("sha256").update(jsonCanonico(pin)).digest("hex");
      expect(oculto.pin).not.toBe(sha);
    }
    expect(JSON.stringify(oculto)).not.toContain("482915");
  });

  it("el mismo PIN da la misma huella y otro PIN, otra", () => {
    const a = ocultarSensibles(input, ["pin"]);
    expect(ocultarSensibles({ ...input }, ["pin"])).toEqual(a);
    expect(ocultarSensibles({ ...input, pin: "482916" }, ["pin"])).not.toEqual(a);
  });

  it("sin campos sensibles no cambia nada", () => {
    expect(ocultarSensibles(input, undefined)).toBe(input);
    expect(ocultarSensibles(input, [])).toBe(input);
  });
});

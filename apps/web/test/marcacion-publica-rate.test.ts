import { describe, expect, it } from "vitest";

import { LIMITES } from "@/lib/rate-limit";

describe("marcación pública · rate limit", () => {
  it("limita intentos fallidos por IP y de forma global (anti-barrido)", () => {
    expect(LIMITES.marcarPublicaMiss.maximoIp).toBeGreaterThan(0);
    expect(LIMITES.marcarPublicaMiss.maximoGlobal).toBeGreaterThan(LIMITES.marcarPublicaMiss.maximoIp);
  });
});
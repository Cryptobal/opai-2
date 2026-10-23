import { describe, expect, it } from "vitest";

import { GET as health } from "../app/api/health/route";

describe("GET /api/health", () => {
  it("responde ok con versión y commit", async () => {
    const res = health();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      version: expect.any(String),
      commit: "local",
    });
  });
});

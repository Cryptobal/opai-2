import { describe, expect, it } from "vitest";

import { GET } from "../app/.well-known/apple-app-site-association/route";
import { config as proxyConfig } from "../proxy";

const CUERPO =
  '{"webcredentials":{"apps":["PRG52N5SNA.cl.opai.app"]}}' as const;

describe("apple-app-site-association", () => {
  it("responde 200 con JSON exacto y Content-Type application/json", async () => {
    const r = GET();
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toContain("application/json");
    expect(await r.text()).toBe(CUERPO);
  });

  it("queda fuera del matcher del proxy (sin pasar por auth)", () => {
    const matcher = proxyConfig.matcher.join(" ");
    expect(matcher).toMatch(/\\\.well-known/);
  });
});
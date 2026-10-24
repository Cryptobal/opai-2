import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy } from "../proxy";

const CERO = "00000000-0000-0000-0000-000000000000";
const pedir = (ruta: string, extra: Record<string, string> = {}) =>
  new NextRequest(`http://localhost:3000${ruta}`, {
    headers: { cookie: "opai.session_token=x", accept: "text/html", ...extra },
  });

afterEach(() => vi.unstubAllGlobals());

describe("proxy: 404 real antes de enviar el HTML", () => {
  it("UUID válido inexistente: reescribe con estado 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ existe: false })));
    const r = await proxy(pedir(`/personas/${CERO}`));
    expect(r.status).toBe(404);
    expect(r.headers.get("x-middleware-rewrite")).toContain("/no-encontrado");
  });

  it("slug inexistente de integraciones: 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ existe: false })));
    expect((await proxy(pedir("/configuracion/integraciones/zzz"))).status).toBe(404);
  });

  it("existe, o la consulta falla: sigue a la página", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ existe: true })));
    expect((await proxy(pedir(`/personas/${CERO}`))).headers.get("x-middleware-next")).toBe("1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("caído")));
    expect((await proxy(pedir(`/personas/${CERO}`))).headers.get("x-middleware-next")).toBe("1");
  });

  it("la navegación del cliente (RSC) no consulta nada", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await proxy(pedir(`/personas/${CERO}`, { rsc: "1" }));
    expect(f).not.toHaveBeenCalled();
  });

  it("id sin forma de UUID: 404 sin consultar la base", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect((await proxy(pedir("/personas/abc"))).status).toBe(404);
    expect(f).not.toHaveBeenCalled();
  });
});

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy } from "../proxy";

const reescribe = (r: Response) => r.headers.get("x-middleware-rewrite") ?? "";

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
    expect(reescribe(r)).toContain("/no-encontrado");
    // Sin `status` forzado: la página de 404 del portal responde 404 con su shell (no la genérica de Next).
    expect(r.status).toBe(200);
  });

  it("ficha de supervisor inexistente: 404 con la página del portal, no la del ERP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => Response.json({ existe: false })),
    );
    const r = await proxy(pedir(`/supervisor/personas/${CERO}`));
    expect(reescribe(r)).toContain("/supervisor/no-encontrado");
    const a = await proxy(pedir(`/configuracion/agentes/${CERO}`));
    expect(reescribe(a)).toContain("/no-encontrado");
  });

  it("slug inexistente de integraciones: 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ existe: false })));
    expect(reescribe(await proxy(pedir("/configuracion/integraciones/zzz")))).toContain(
      "/no-encontrado",
    );
  });

  it("existe, o la consulta falla: sigue a la página", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ existe: true })));
    expect((await proxy(pedir(`/personas/${CERO}`))).headers.get("x-middleware-next")).toBe("1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("caído")));
    expect((await proxy(pedir(`/personas/${CERO}`))).headers.get("x-middleware-next")).toBe("1");
  });

  it("pasa la IP real del cliente a /api/existe (cupo por persona, no uno global) (H5)", async () => {
    const f = vi.fn().mockResolvedValue(Response.json({ existe: true }));
    vi.stubGlobal("fetch", f);
    await proxy(pedir(`/personas/${CERO}`, { "x-forwarded-for": "9.9.9.9, 10.0.0.1" }));
    const init = f.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-opai-ip"]).toBe("9.9.9.9");
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
    expect(reescribe(await proxy(pedir("/personas/abc")))).toContain("/no-encontrado");
    expect(f).not.toHaveBeenCalled();
  });

  it("la consulta responde 401/HTML (preview protegido): sigue a la página", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 401 })));
    const r = await proxy(pedir(`/personas/${CERO}`));
    expect(r.headers.get("x-middleware-next")).toBe("1");
  });

  it("slug con % malformado no rompe el proxy", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const r = await proxy(pedir("/configuracion/integraciones/%E0%A4%A"));
    expect(r.headers.get("x-middleware-next")).toBe("1");
  });
});

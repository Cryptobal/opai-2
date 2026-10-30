import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy } from "../proxy";

const reescribe = (r: Response) => r.headers.get("x-middleware-rewrite") ?? "";

const CERO = "00000000-0000-0000-0000-000000000000";
const pedir = (ruta: string, extra: Record<string, string> = {}) =>
  new NextRequest(`http://localhost:3000${ruta}`, {
    headers: { cookie: "opai.session_token=x", accept: "text/html", ...extra },
  });

/**
 * `/api/existe` responde `{ existe }`; cualquier otra URL es el `fetch` interno de `respuesta404`
 * para obtener el cuerpo (y el estado real) de la página de destino.
 */
const mockFetch = (existe: boolean) =>
  vi.fn().mockImplementation(async (entrada: string | URL) => {
    const url = String(entrada);
    if (url.includes("/api/existe")) return Response.json({ existe });
    return new Response(`<html data-ruta="${new URL(url).pathname}"></html>`, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  });

afterEach(() => vi.unstubAllGlobals());

describe("proxy: 404 real antes de enviar el HTML", () => {
  it("UUID válido inexistente: 404 real con el cuerpo de la página de destino", async () => {
    vi.stubGlobal("fetch", mockFetch(false));
    const r = await proxy(pedir(`/personas/${CERO}`));
    expect(r.status).toBe(404);
    expect(await r.text()).toContain("/no-encontrado");
  });

  it("ficha de supervisor inexistente: 404 con la página del portal, no la del ERP", async () => {
    vi.stubGlobal("fetch", mockFetch(false));
    const r = await proxy(pedir(`/supervisor/personas/${CERO}`));
    expect(r.status).toBe(404);
    expect(await r.text()).toContain("/supervisor/no-encontrado");
    const a = await proxy(pedir(`/configuracion/agentes/${CERO}`));
    expect(a.status).toBe(404);
    expect(await a.text()).toContain("/no-encontrado");
  });

  it("slug inexistente de integraciones: 404", async () => {
    vi.stubGlobal("fetch", mockFetch(false));
    const r = await proxy(pedir("/configuracion/integraciones/zzz"));
    expect(r.status).toBe(404);
    expect(await r.text()).toContain("/no-encontrado");
  });

  it("grupo de configuración inexistente: 404 con la página del ERP", async () => {
    vi.stubGlobal("fetch", mockFetch(false));
    const r = await proxy(pedir("/configuracion/grupo/inventado"));
    expect(r.status).toBe(404);
    expect(await r.text()).toContain("/no-encontrado");
  });

  it("existe, o la consulta falla: sigue a la página", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ existe: true })));
    expect((await proxy(pedir(`/personas/${CERO}`))).headers.get("x-middleware-next")).toBe("1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("caído")));
    expect((await proxy(pedir(`/personas/${CERO}`))).headers.get("x-middleware-next")).toBe("1");
  });

  it("reenvía la cookie a /api/existe para que el cupo cuente por usuario (H5)", async () => {
    const f = vi.fn().mockResolvedValue(Response.json({ existe: true }));
    vi.stubGlobal("fetch", f);
    await proxy(pedir(`/personas/${CERO}`, { "x-forwarded-for": "9.9.9.9, 10.0.0.1" }));
    const init = f.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    // La cookie viaja (la ruta resuelve la sesión y cuenta por usuario); no se manda IP del cliente
    // (sería falsificable por quien golpee la ruta directo para saltarse el tope y enumerar).
    expect(headers["cookie"]).toContain("opai.session_token=x");
    expect(headers["x-opai-ip"]).toBeUndefined();
  });

  it("la navegación del cliente (RSC) no consulta nada", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await proxy(pedir(`/personas/${CERO}`, { rsc: "1" }));
    expect(f).not.toHaveBeenCalled();
  });

  it("id sin forma de UUID: 404 real sin consultar /api/existe", async () => {
    const f = mockFetch(false);
    vi.stubGlobal("fetch", f);
    const r = await proxy(pedir("/personas/abc"));
    expect(r.status).toBe(404);
    expect(f.mock.calls.every(([url]) => !String(url).includes("/api/existe"))).toBe(true);
  });

  it("si la página de destino no responde, cae al rewrite simple (nunca rompe la navegación)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("caído")));
    const r = await proxy(pedir("/personas/abc"));
    expect(reescribe(r)).toContain("/no-encontrado");
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

  it("navegación RSC a un id inválido: sigue con el rewrite simple (no pide el cuerpo)", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const r = await proxy(pedir("/personas/abc", { rsc: "1" }));
    expect(reescribe(r)).toContain("/no-encontrado");
    expect(f).not.toHaveBeenCalled();
  });
});

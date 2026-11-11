// CAR-263: «Probar conexión» de Emisión DTE comprueba la API key contra SimpleAPI (antes caía en la prueba de correo).
// `fetch` se simula y nunca sale a la red; la key es ficticia.
import { randomBytes } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { capacidadesDelNucleo, executeCapability, limpiarRegistro, registrarCapacidades } from "../src";
import { contextoDePrueba } from "../src/testing";

/** Key ficticia de 20 caracteres (el largo de la key real; el `1111-1111-1111-1111` de la doc es solo un ejemplo). */
const KEY = "1111-AAAA-2222-BBBBB";
type Probar = { ok: boolean; mensaje: string };

beforeAll(() => {
  process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
});
beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});
afterEach(() => vi.unstubAllGlobals());

async function conKey(valor: string) {
  const { ctx } = contextoDePrueba();
  const r = await executeCapability(ctx, "core.integraciones.set_secreto", { proveedor: "dte_emision", nombre: "api_key", valor });
  expect(r.ok).toBe(true);
  return ctx;
}
/** Responde según el esquema del header `Authorization`: `basic` («Basic …») o `raw` (la key cruda). */
const responder = (r: (esquema: "basic" | "raw") => Response) => {
  const f = vi.fn(async (_url: unknown, init?: RequestInit) =>
    r(String((init?.headers as Record<string, string>)["Authorization"]).startsWith("Basic ") ? "basic" : "raw"),
  );
  vi.stubGlobal("fetch", f);
  return f;
};
async function probar(ctx: Awaited<ReturnType<typeof conKey>>): Promise<Probar> {
  const r = await executeCapability(ctx, "core.integraciones.probar", { proveedor: "dte_emision" });
  if (!r.ok) throw new Error("la capacidad falló");
  return r.data as Probar;
}

describe("core.integraciones.probar con dte_emision (CAR-263)", () => {
  it("llama a Suscripcion/status de SimpleAPI con la key guardada, no a la prueba de correo", async () => {
    const ctx = await conKey(KEY);
    const f = responder(() => Response.json({ mensaje: "Suscripcion activa" }));
    const d = await probar(ctx);
    expect(f).toHaveBeenCalledTimes(1);
    expect(String(f.mock.calls[0]?.[0])).toBe("https://api.simpleapi.cl/api/v1/Suscripcion/status");
    expect(d).toMatchObject({ ok: true });
    expect(d.mensaje).toBe("SimpleAPI reconoce la API key (Suscripcion activa). Falta cargar el certificado digital y su clave.");
    expect(d.mensaje).not.toContain(KEY);
  });

  it("Basic 401 y key cruda 200: la key de 20 caracteres está reconocida (CAR-263b)", async () => {
    const ctx = await conKey(KEY);
    const f = responder((esquema) => (esquema === "basic" ? new Response("", { status: 401 }) : Response.json({ mensaje: "Suscripcion activa" })));
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const d = await probar(ctx);
    expect(f).toHaveBeenCalledTimes(2);
    expect(d).toMatchObject({ ok: true, mensaje: "SimpleAPI reconoce la API key (Suscripcion activa). Falta cargar el certificado digital y su clave." });
    // Log categórico con el esquema aceptado; nunca la key ni el header.
    const log = info.mock.calls.find((c) => c[0] === "[sii] probar_key")?.[1];
    expect(log).toEqual({ evento: "sii.simpleapi.probar_key", estado: "reconocida", status: 200, esquema: "raw" });
    expect(JSON.stringify(info.mock.calls)).not.toContain(KEY);
    info.mockRestore();
  });

  it("401 vacío con los dos esquemas: la key no está reconocida, sin tratar 19 como el largo correcto", async () => {
    const ctx = await conKey(KEY);
    const f = responder(() => new Response("", { status: 401, headers: { "x-rate-limit-limit": "1m", "x-rate-limit-remaining": "39" } }));
    const d = await probar(ctx);
    expect(f).toHaveBeenCalledTimes(2);
    expect(d.ok).toBe(false);
    expect(d.mensaje).toMatch(/^SimpleAPI no reconoce la API key guardada \(HTTP 401, probada como Basic y como key directa\)/);
    expect(d.mensaje).toContain("La key guardada tiene 20 caracteres; compárala con la del panel.");
    expect(d.mensaje).not.toMatch(/19|1111-1111/);
    expect(d.mensaje).not.toContain(KEY);
    const lista = await executeCapability(ctx, "core.integraciones.list", {});
    const fila = (lista.ok ? (lista.data as { proveedor: string; estado: string }[]) : []).find((i) => i.proveedor === "dte_emision");
    expect(fila?.estado).toBe("error");
  });

  it("una key pegada con comillas lo dice sin mostrarla", async () => {
    const ctx = await conKey(`"${KEY}"`);
    responder(() => new Response("", { status: 401 }));
    const d = await probar(ctx);
    expect(d.mensaje).toContain("tiene 22 caracteres y alguno no es letra, número ni guion");
    expect(d.mensaje).not.toContain(KEY);
  });

  it("sin key guardada no llama a SimpleAPI; un 5xx no culpa a la key", async () => {
    const f = responder(() => new Response("", { status: 503 }));
    const { ctx: sinKey } = contextoDePrueba();
    expect(await probar(sinKey)).toMatchObject({ ok: false, mensaje: "Falta la API key de SimpleAPI en Emisión DTE." });
    expect(f).not.toHaveBeenCalled();
    const d = await probar(await conKey(KEY));
    expect(d.ok).toBe(false);
    expect(d.mensaje).toMatch(/respondió HTTP 503.*no se pudo comprobar la API key/);
  });
});

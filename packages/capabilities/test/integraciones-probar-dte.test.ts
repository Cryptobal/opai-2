// CAR-263: «Probar conexión» de Emisión DTE comprueba la API key contra SimpleAPI (antes caía en la prueba de correo).
// `fetch` se simula y nunca sale a la red; la key es ficticia.
import { randomBytes } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { capacidadesDelNucleo, executeCapability, limpiarRegistro, registrarCapacidades } from "../src";
import { contextoDePrueba } from "../src/testing";

const KEY = "1111-AAAA-2222-BBBB";
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
const responder = (r: () => Response) => {
  const f = vi.fn(async (_url: unknown, _init?: RequestInit) => r());
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

  it("401 vacío con x-rate-limit-*: la key no está reconocida y la integración queda en error", async () => {
    const ctx = await conKey(KEY);
    responder(() => new Response("", { status: 401, headers: { "x-rate-limit-limit": "1m", "x-rate-limit-remaining": "39" } }));
    const d = await probar(ctx);
    expect(d.ok).toBe(false);
    expect(d.mensaje).toMatch(/^SimpleAPI no reconoce la API key guardada \(HTTP 401\)/);
    expect(d.mensaje).toContain("tiene 19 caracteres.");
    expect(d.mensaje).not.toContain(KEY);
    const lista = await executeCapability(ctx, "core.integraciones.list", {});
    const fila = (lista.ok ? (lista.data as { proveedor: string; estado: string }[]) : []).find((i) => i.proveedor === "dte_emision");
    expect(fila?.estado).toBe("error");
  });

  it("una key con un carácter invisible pegado lo dice sin mostrarla", async () => {
    const ctx = await conKey(`​${KEY}`);
    responder(() => new Response("", { status: 401 }));
    const d = await probar(ctx);
    expect(d.mensaje).toContain("tiene 20 caracteres y alguno no es letra, número ni guion");
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

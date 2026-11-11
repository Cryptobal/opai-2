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
/** Simula SimpleAPI: Basic responde `basic()`, el POST de token entrega uno y Bearer responde `bearer()`. */
const TOKEN = "aaa.bbb.ccc";
const mudo = () => new Response("", { status: 401, headers: { "x-rate-limit-limit": "1m", "x-rate-limit-remaining": "39" } });
function simular(bearer: () => Response, basic: () => Response = mudo) {
  const f = vi.fn(async (url: unknown, init?: RequestInit) => {
    if (String(url).endsWith("/api/Auth/token")) return new Response(TOKEN);
    const auth = (init?.headers as Record<string, string> | undefined)?.["Authorization"] ?? "";
    return auth.startsWith("Bearer ") ? bearer() : basic();
  });
  vi.stubGlobal("fetch", f);
  return f;
}
async function probar(ctx: Awaited<ReturnType<typeof conKey>>): Promise<Probar> {
  const r = await executeCapability(ctx, "core.integraciones.probar", { proveedor: "dte_emision" });
  if (!r.ok) throw new Error("la capacidad falló");
  return r.data as Probar;
}

describe("core.integraciones.probar con dte_emision (CAR-263, CAR-240)", () => {
  it("mide la key en Suscripcion/status por Basic y por token, no con la prueba de correo", async () => {
    const ctx = await conKey(KEY);
    const f = simular(() => Response.json([{ producto: "DTE" }]));
    const d = await probar(ctx);
    expect(f.mock.calls.map((c) => String(c[0]))).toEqual([
      "https://api.simpleapi.cl/api/v1/Suscripcion/status",
      "https://api.simpleapi.cl/api/Auth/token",
      "https://api.simpleapi.cl/api/v1/Suscripcion/status",
    ]);
    expect(d).toMatchObject({ ok: true });
    expect(d.mensaje).toBe(
      "SimpleAPI reconoce la API key (1 suscripción; Consulta de suscripción: con Basic, HTTP 401; con token, HTTP 200). Falta cargar el certificado digital y su clave.",
    );
    for (const secreto of [KEY, TOKEN, "producto"]) expect(d.mensaje).not.toContain(secreto);
  });

  it("lista vacía: informa lo medido sin afirmar que la key está mal, y la integración queda en error", async () => {
    const ctx = await conKey(KEY);
    simular(() => Response.json([]));
    const d = await probar(ctx);
    expect(d.ok).toBe(false);
    expect(d.mensaje).toMatch(/^SimpleAPI no informa ninguna suscripción para la API key guardada/);
    expect(d.mensaje).toContain("con Basic, HTTP 401; con token, HTTP 200");
    expect(d.mensaje).toContain("tiene 19 caracteres;");
    expect(d.mensaje).not.toMatch(/mal copiada|vencida/);
    expect(d.mensaje).not.toContain(KEY);
    const lista = await executeCapability(ctx, "core.integraciones.list", {});
    const fila = (lista.ok ? (lista.data as { proveedor: string; estado: string }[]) : []).find((i) => i.proveedor === "dte_emision");
    expect(fila?.estado).toBe("error");
  });

  it("una key pegada con comillas lo dice sin mostrarla", async () => {
    const ctx = await conKey(`"${KEY}"`);
    simular(() => Response.json([]));
    const d = await probar(ctx);
    expect(d.mensaje).toContain("tiene 21 caracteres y alguno no es letra, número ni guion");
    expect(d.mensaje).not.toContain(KEY);
  });

  it("sin key guardada no llama a SimpleAPI; sin lista no culpa a la key", async () => {
    const f = simular(() => new Response("", { status: 503 }), () => new Response("", { status: 503 }));
    const { ctx: sinKey } = contextoDePrueba();
    expect(await probar(sinKey)).toMatchObject({ ok: false, mensaje: "Falta la API key de SimpleAPI en Emisión DTE." });
    expect(f).not.toHaveBeenCalled();
    const d = await probar(await conKey(KEY));
    expect(d.ok).toBe(false);
    expect(d.mensaje).toMatch(/^No se pudo comprobar la API key en SimpleAPI\. .*con Basic, HTTP 503; con token, HTTP 503/);
  });
});

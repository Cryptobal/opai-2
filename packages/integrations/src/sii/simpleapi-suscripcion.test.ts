// CAR-263: prueba de la API key contra `Suscripcion/status`. `fetch` se simula y nunca sale a la red.
import { afterEach, describe, expect, it, vi } from "vitest";

import { formaDeKeySimpleApi, probarKeySimpleApi, SIMPLEAPI_RUTA_SUSCRIPCION } from "./simpleapi-suscripcion";

const KEY = "1111-AAAA-2222-BBBB";
const responder = (r: () => Response) => {
  const f = vi.fn(async (_url: unknown, _init?: RequestInit) => r());
  vi.stubGlobal("fetch", f);
  return f;
};

afterEach(() => vi.unstubAllGlobals());

describe("probarKeySimpleApi (CAR-263)", () => {
  it("llama por GET a Suscripcion/status con Basic api:key, sin cuerpo ni la key cruda", async () => {
    const f = responder(() => Response.json({ mensaje: "Suscripcion activa" }));
    const r = await probarKeySimpleApi(`  ${KEY}\n`);
    expect(r).toEqual({ estado: "reconocida", status: 200, detalle: "Suscripcion activa" });
    const [url, init] = f.mock.calls[0] ?? [];
    expect(url).toBe(SIMPLEAPI_RUTA_SUSCRIPCION);
    expect(url).toBe("https://api.simpleapi.cl/api/v1/Suscripcion/status");
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    const auth = (init?.headers as Record<string, string>)["Authorization"];
    expect(auth).toBe(`Basic ${Buffer.from(`api:${KEY}`, "utf8").toString("base64")}`);
    expect(auth).not.toContain(KEY);
  });

  it("401 vacío con x-rate-limit-* es key no reconocida: así responde SimpleAPI sin key (verificado 10-nov-2026)", async () => {
    // Respuesta real de api.simpleapi.cl a una petición sin Authorization o con una key inventada.
    const headers = { "x-rate-limit-limit": "1m", "x-rate-limit-remaining": "39" };
    for (const status of [401, 403]) {
      responder(() => new Response("", { status, headers }));
      expect(await probarKeySimpleApi(KEY)).toEqual({ estado: "no_reconocida", status, detalle: null });
    }
  });

  it("otros estados no dicen nada de la key", async () => {
    for (const status of [404, 429, 500, 503]) {
      responder(() => new Response("", { status }));
      expect((await probarKeySimpleApi(KEY)).estado).toBe("sin_respuesta");
    }
  });

  it("el detalle nunca trae la key aunque el proveedor la devuelva", async () => {
    responder(() => Response.json({ mensaje: `Apikey ${KEY} vencida` }, { status: 401 }));
    const r = await probarKeySimpleApi(KEY);
    expect(r.estado).toBe("no_reconocida");
    expect(JSON.stringify(r)).not.toContain(KEY);
  });
});

describe("formaDeKeySimpleApi", () => {
  it("cuenta el largo sin espacios ni invisibles y avisa de caracteres que no son letras, números ni guiones", () => {
    expect(formaDeKeySimpleApi(` \u200B${KEY.slice(0, 4)} ${KEY.slice(4)}\n`)).toEqual({ largo: 19, caracteresExtranos: false });
    for (const rara of [`"${KEY}"`, KEY.replace("-", "_"), `${KEY}.x`]) {
      expect(formaDeKeySimpleApi(rara).caracteresExtranos).toBe(true);
    }
  });
});

describe("probarKeySimpleApi sin red (CAR-263)", () => {
  it("un fallo de red o un tiempo agotado no culpa a la key", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    expect(await probarKeySimpleApi(KEY)).toEqual({ estado: "sin_respuesta", status: 0, detalle: null });
  });
});

// CAR-263 / CAR-263b: prueba de la API key contra `Suscripcion/status`, con Basic y con la key cruda. `fetch` se simula
// y nunca sale a la red; las keys son ficticias.
import { afterEach, describe, expect, it, vi } from "vitest";

import { formaDeKeySimpleApi, probarKeySimpleApi, SIMPLEAPI_RUTA_SUSCRIPCION } from "./simpleapi-suscripcion";

/** Key ficticia de 20 caracteres: el largo de la key real de Carlos (el `1111-1111-1111-1111` de la doc es un ejemplo). */
const KEY = "1111-AAAA-2222-BBBBB";
const BASIC = `Basic ${Buffer.from(`api:${KEY}`, "utf8").toString("base64")}`;
const LIMITES = { "x-rate-limit-limit": "1m", "x-rate-limit-remaining": "39" };

/** Responde según el header `Authorization` recibido: `basic` (empieza con «Basic ») o `raw`. */
const responder = (r: (esquema: "basic" | "raw") => Response) => {
  const f = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const auth = (init?.headers as Record<string, string>)["Authorization"] ?? "";
    return r(auth.startsWith("Basic ") ? "basic" : "raw");
  });
  vi.stubGlobal("fetch", f);
  return f;
};
const auths = (f: ReturnType<typeof responder>) =>
  f.mock.calls.map(([, init]) => (init?.headers as Record<string, string>)["Authorization"]);

afterEach(() => vi.unstubAllGlobals());

describe("probarKeySimpleApi (CAR-263b)", () => {
  it("Basic 200 a la primera: reconocida con esquema basic, una sola llamada GET sin cuerpo", async () => {
    const f = responder(() => Response.json({ mensaje: "Suscripcion activa" }));
    const r = await probarKeySimpleApi(`  ${KEY}\n`);
    expect(r).toEqual({ estado: "reconocida", status: 200, esquema: "basic", detalle: "Suscripcion activa" });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] ?? [];
    expect(url).toBe(SIMPLEAPI_RUTA_SUSCRIPCION);
    expect(url).toBe("https://api.simpleapi.cl/api/v1/Suscripcion/status");
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(auths(f)).toEqual([BASIC]);
  });

  it("Basic 401 y key cruda 200: reconocida con esquema raw (el caso de una key válida que esta ruta no lee en Basic)", async () => {
    const f = responder((esquema) => (esquema === "basic" ? new Response("", { status: 401, headers: LIMITES }) : Response.json({ mensaje: "Suscripcion activa" })));
    const r = await probarKeySimpleApi(`${KEY}\u200B`);
    expect(r).toEqual({ estado: "reconocida", status: 200, esquema: "raw", detalle: "Suscripcion activa" });
    // La key cruda va limpia (sin espacios ni invisibles), igual que dentro del Basic.
    expect(auths(f)).toEqual([BASIC, KEY]);
  });

  it("401 o 403 con los dos esquemas: no reconocida", async () => {
    for (const status of [401, 403]) {
      const f = responder(() => new Response("", { status, headers: LIMITES }));
      expect(await probarKeySimpleApi(KEY)).toEqual({ estado: "no_reconocida", status, detalle: null });
      expect(auths(f)).toEqual([BASIC, KEY]);
    }
  });

  it("otros estados no dicen nada de la key y no reintentan con la key cruda", async () => {
    for (const status of [404, 429, 500, 503]) {
      const f = responder(() => new Response("", { status }));
      expect((await probarKeySimpleApi(KEY)).estado).toBe("sin_respuesta");
      expect(f).toHaveBeenCalledTimes(1);
    }
  });

  it("Basic 401 y la key cruda sin respuesta (5xx): no se culpa a la key", async () => {
    responder((esquema) => new Response("", { status: esquema === "basic" ? 401 : 503 }));
    expect(await probarKeySimpleApi(KEY)).toEqual({ estado: "sin_respuesta", status: 503, detalle: null });
  });

  it("una key con comillas tipográficas no se manda cruda (fetch no admite >0xFF en headers): queda no reconocida", async () => {
    const f = responder(() => new Response("", { status: 401 }));
    expect(await probarKeySimpleApi(`\u201C${KEY}\u201D`)).toEqual({ estado: "no_reconocida", status: 401, detalle: null });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("el detalle nunca trae la key aunque el proveedor la devuelva, en ninguno de los dos intentos", async () => {
    responder(() => Response.json({ mensaje: `Apikey ${KEY} vencida` }, { status: 401 }));
    const r = await probarKeySimpleApi(KEY);
    expect(r.estado).toBe("no_reconocida");
    expect(JSON.stringify(r)).not.toContain(KEY);
  });
});

describe("formaDeKeySimpleApi", () => {
  it("una key de 20 caracteres con letras, números y guiones es forma válida; cuenta sin espacios ni invisibles", () => {
    expect(formaDeKeySimpleApi(KEY)).toEqual({ largo: 20, caracteresExtranos: false });
    expect(formaDeKeySimpleApi(` \u200B${KEY.slice(0, 4)} ${KEY.slice(4)}\n`)).toEqual({ largo: 20, caracteresExtranos: false });
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

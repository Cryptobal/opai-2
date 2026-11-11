// CAR-263 / CAR-240: medición de la API key contra `Suscripcion/status` por Basic y por token. `fetch` se simula.
import { afterEach, describe, expect, it, vi } from "vitest";

import { postMultipartSimpleApi } from "./simpleapi-http";
import { formaDeKeySimpleApi, medirKeySimpleApi, SIMPLEAPI_RUTA_SUSCRIPCION } from "./simpleapi-suscripcion";
import { SIMPLEAPI_RUTA_TOKEN, tokenSimpleApi } from "./simpleapi-token";

const KEY = "1111-AAAA-2222-BBBB";
const TOKEN = "aaa.bbb.ccc";
type Llamada = { url: string; auth: string | undefined; body: unknown };

/** Simula SimpleAPI: `token` responde el POST de token; `resto` responde lo demás según su `Authorization`. */
function simular(token: () => Response, resto: (auth: string) => Response) {
  const llamadas: Llamada[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string> | undefined)?.["Authorization"];
      llamadas.push({ url: String(url), auth, body: init?.body });
      return String(url) === SIMPLEAPI_RUTA_TOKEN ? token() : resto(auth ?? "");
    }),
  );
  return llamadas;
}
const mudo = () => new Response("", { status: 401, headers: { "x-rate-limit-limit": "1m", "x-rate-limit-remaining": "39" } });

afterEach(() => vi.unstubAllGlobals());

describe("tokenSimpleApi", () => {
  it("pide el token con la key limpia en el cuerpo y solo acepta un JWT", async () => {
    const llamadas = simular(() => new Response(TOKEN), mudo);
    expect(await tokenSimpleApi(` ${KEY}\n`)).toBe(TOKEN);
    expect(llamadas[0]).toMatchObject({ url: "https://api.simpleapi.cl/api/Auth/token", body: JSON.stringify({ apikey: KEY }) });
    simular(() => new Response("<html>error</html>"), mudo);
    expect(await tokenSimpleApi(KEY)).toBeNull();
    simular(() => new Response("", { status: 500 }), mudo);
    expect(await tokenSimpleApi(KEY)).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    expect(await tokenSimpleApi(KEY)).toBeNull();
  });
});

describe("medirKeySimpleApi", () => {
  it("key que SimpleAPI no conoce (respuesta real del 10-nov-2026): Basic 401 mudo, token 200 con lista vacía", async () => {
    const llamadas = simular(() => new Response(TOKEN), (auth) => (auth.startsWith("Bearer ") ? Response.json([]) : mudo()));
    expect(await medirKeySimpleApi(KEY)).toEqual({ basic: 401, bearer: 200, suscripciones: 0 });
    expect(llamadas.map((l) => l.url)).toEqual([SIMPLEAPI_RUTA_SUSCRIPCION, SIMPLEAPI_RUTA_TOKEN, SIMPLEAPI_RUTA_SUSCRIPCION]);
    expect(llamadas[0]?.auth).toBe(`Basic ${Buffer.from(`api:${KEY}`, "utf8").toString("base64")}`);
    expect(llamadas[2]?.auth).toBe(`Bearer ${TOKEN}`);
  });
  it("cuenta las suscripciones sin devolver su contenido", async () => {
    simular(() => new Response(TOKEN), (auth) => (auth.startsWith("Bearer ") ? Response.json([{ plan: "x" }, { plan: "y" }]) : mudo()));
    const m = await medirKeySimpleApi(KEY);
    expect(m).toEqual({ basic: 401, bearer: 200, suscripciones: 2 });
    expect(JSON.stringify(m)).not.toContain("plan");
  });
  it("sin token ni conexión no afirma nada de la key", async () => {
    simular(() => new Response("", { status: 500 }), mudo);
    expect(await medirKeySimpleApi(KEY)).toEqual({ basic: 401, bearer: null, suscripciones: null });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    expect(await medirKeySimpleApi(KEY)).toEqual({ basic: 0, bearer: null, suscripciones: null });
  });
});

describe("postMultipartSimpleApi: reintento con token ante el rechazo mudo (CAR-240)", () => {
  const partes = [{ nombre: "input", texto: "{}" }] as const;
  it("401 sin cuerpo con Basic → repite una vez con Bearer y devuelve esa respuesta (con el motivo en texto)", async () => {
    const llamadas = simular(() => new Response(TOKEN), (auth) =>
      auth.startsWith("Bearer ") ? new Response("RUT de emisor  incorrecto", { status: 400 }) : mudo(),
    );
    const res = await postMultipartSimpleApi("https://api.simpleapi.cl/api/v1/dte/generar", KEY, partes);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("RUT de emisor  incorrecto");
    expect(llamadas.map((l) => l.auth?.split(" ")[0])).toEqual(["Basic", undefined, "Bearer"]);
  });
  it("si Basic funciona o el rechazo trae texto, no hay segunda llamada; sin token queda el rechazo original", async () => {
    let llamadas = simular(() => new Response(TOKEN), () => new Response("<DTE/>", { status: 200 }));
    expect((await postMultipartSimpleApi("https://api.simpleapi.cl/x", KEY, partes)).status).toBe(200);
    expect(llamadas).toHaveLength(1);
    llamadas = simular(() => new Response(TOKEN), () => new Response("Apikey vencida", { status: 401 }));
    expect((await postMultipartSimpleApi("https://api.simpleapi.cl/x", KEY, partes)).status).toBe(401);
    expect(llamadas).toHaveLength(1);
    llamadas = simular(() => new Response("", { status: 500 }), mudo);
    expect((await postMultipartSimpleApi("https://api.simpleapi.cl/x", KEY, partes)).status).toBe(401);
    expect(llamadas).toHaveLength(2);
  });
});

describe("formaDeKeySimpleApi", () => {
  it("cuenta el largo sin espacios ni invisibles y avisa de caracteres que no son letras, números ni guiones", () => {
    expect(formaDeKeySimpleApi(`  ${KEY.slice(0, 4)} ${KEY.slice(4)}\n`)).toEqual({ largo: 19, caracteresExtranos: false });
    for (const rara of [`"${KEY}"`, KEY.replace("-", "_"), `${KEY}.x`]) {
      expect(formaDeKeySimpleApi(rara).caracteresExtranos).toBe(true);
    }
  });
});

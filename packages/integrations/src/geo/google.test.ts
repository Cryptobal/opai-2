import { afterEach, describe, expect, it, vi } from "vitest";

import { distanciaLineaRecta, ErrorGoogle, geoGoogle, puntoValido } from "./google";

describe("geolocalización Google", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("geocodifica y normaliza comuna, región y coordenadas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "OK",
          results: [
            {
              place_id: "p1",
              formatted_address: "Av. Las Industrias 4520, Quilicura, Región Metropolitana, Chile",
              geometry: { location: { lat: -33.36, lng: -70.73 } },
              address_components: [
                { long_name: "4520", types: ["street_number"] },
                { long_name: "Avenida Las Industrias", types: ["route"] },
                { long_name: "Quilicura", types: ["administrative_area_level_3"] },
                { long_name: "Región Metropolitana", types: ["administrative_area_level_1"] },
                { long_name: "Chile", types: ["country"] },
              ],
            },
          ],
        }),
      ),
    );
    const d = await geoGoogle("k").geocodificar("Las Industrias 4520 Quilicura");
    expect(d).toMatchObject({
      placeId: "p1",
      calle: "Avenida Las Industrias 4520",
      comuna: "Quilicura",
      region: "Región Metropolitana",
      lat: -33.36,
    });
  });

  it("sin resultados devuelve null y un error HTTP se informa", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ status: "ZERO_RESULTS", results: [] })),
    );
    expect(await geoGoogle("k").geocodificar("nada")).toBeNull();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("x", { status: 403 })),
    );
    await expect(geoGoogle("k").autocompletar("Las")).rejects.toThrow(/403/);
  });

  it("la URL del mapa incluye la clave (solo para el proxy del servidor)", () => {
    const url = new URL(geoGoogle("CLAVE").urlMapa(-33.36, -70.73));
    expect(url.searchParams.get("key")).toBe("CLAVE");
    expect(url.searchParams.get("markers")).toBe("-33.36,-70.73");
  });
});

describe("fallas de Google Maps (estado y mensaje, nunca la clave)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("Places 403 informa el estado y el mensaje de Google y lo registra sin la clave", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: 403,
              status: "PERMISSION_DENIED",
              message: "Places API (New) has not been used in project 123 (clave SECRETA-XYZ).",
            },
          },
          { status: 403 },
        ),
      ),
    );
    const falla = await geoGoogle("SECRETA-XYZ")
      .autocompletar("Las Industrias")
      .catch((e: unknown) => e);
    expect(falla).toBeInstanceOf(ErrorGoogle);
    const e = falla as ErrorGoogle;
    expect([e.http, e.estado, e.api]).toEqual([403, "PERMISSION_DENIED", "Places autocompletar"]);
    expect(e.message).toContain("Places API (New) has not been used");
    expect(e.message).not.toContain("SECRETA-XYZ");
    const registrado = String(log.mock.calls[0]?.[0]);
    expect(registrado).toContain("PERMISSION_DENIED");
    expect(registrado).not.toContain("SECRETA-XYZ");
  });

  it("Geocoding con REQUEST_DENIED (HTTP 200) es un error, no «sin resultados»", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "REQUEST_DENIED",
          error_message: "This API project is not authorized to use this API.",
          results: [],
        }),
      ),
    );
    await expect(geoGoogle("k").geocodificar("Plaza de Armas")).rejects.toThrow(
      /REQUEST_DENIED.*not authorized/,
    );
  });

  it("una caída de red se informa sin exponer la URL con la clave", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    const e = (await geoGoogle("SECRETA")
      .geocodificar("Plaza de Armas")
      .catch((x: unknown) => x)) as Error;
    expect(e).toBeInstanceOf(ErrorGoogle);
    expect(e.message).toContain("fetch failed");
    expect(e.message).not.toContain("SECRETA");
  });
});

describe("geolocalización Google · distancia (CAR-194)", () => {
  afterEach(() => vi.unstubAllGlobals());
  const stgo = { lat: -33.4489, lng: -70.6693 };
  const rancagua = { lat: -34.1708, lng: -70.7444 };

  it("pide la ruta a Routes API (TRAFFIC_UNAWARE, CL) y devuelve km con origen google", async () => {
    const f = vi.fn(async (_u: URL | string, _i?: RequestInit) => Response.json({ routes: [{ distanceMeters: 87_432 }] }));
    vi.stubGlobal("fetch", f);
    expect(await geoGoogle("k").distancia(stgo, rancagua)).toEqual({ km: 87.4, origenDistancia: "google" });
    expect(String(f.mock.calls[0]?.[0])).toBe("https://routes.googleapis.com/directions/v2:computeRoutes");
    const init = f.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({ travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE", regionCode: "CL" });
    expect((init?.headers as Record<string, string>)["X-Goog-FieldMask"]).toBe("routes.distanceMeters");
  });

  it("si Google rechaza o no devuelve ruta cae a línea recta y lo informa (nunca 0)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 403 })));
    const a = await geoGoogle("k").distancia(stgo, rancagua);
    expect(a.origenDistancia).toBe("linea_recta");
    expect(a.km).toBeGreaterThan(70);
    expect(a.km).toBeLessThan(85);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
    expect((await geoGoogle("k").distancia(stgo, rancagua)).origenDistancia).toBe("linea_recta");
  });

  it("puntos distintos muy cercanos no dan 0; el mismo punto da 0 honesto", () => {
    expect(distanciaLineaRecta(stgo, { lat: stgo.lat + 0.00001, lng: stgo.lng }).km).toBe(0.1);
    expect(distanciaLineaRecta(stgo, stgo).km).toBe(0);
    expect(puntoValido({ lat: 91, lng: 0 })).toBe(false);
  });
});

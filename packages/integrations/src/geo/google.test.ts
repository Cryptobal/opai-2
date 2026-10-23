import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorGoogle, geoGoogle } from "./google";

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

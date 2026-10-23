import { afterEach, describe, expect, it, vi } from "vitest";

import { geoGoogle } from "./google";

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

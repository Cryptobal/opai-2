import { describe, expect, it } from "vitest";

import { leerPuntoMapa, urlMapaOpai } from "@/lib/mapa";

const url = (q: string) => new URL(`https://test.opai.cl/api/geo/mapa?${q}`);

describe("proxy de mapas: parámetros", () => {
  it("la URL que arma la UI es la que el proxy entiende (ida y vuelta)", () => {
    const u = new URL(
      urlMapaOpai({ lat: -33.3612345, lng: -70.7312345, zoom: 17 }),
      "https://x.cl",
    );
    expect(u.pathname).toBe("/api/geo/mapa");
    expect(leerPuntoMapa(u)).toEqual({ lat: -33.36123, lng: -70.73123, zoom: 17 });
  });

  it("el zoom por defecto es 16", () => {
    expect(leerPuntoMapa(url("lat=-33.4&lng=-70.6"))?.zoom).toBe(16);
  });

  it("rechaza lo que no es un punto válido (nada llega a Google)", () => {
    for (const q of [
      "",
      "lat=-33.4",
      "lat=abc&lng=1",
      "lat=91&lng=0",
      "lat=0&lng=181",
      "lat=-33.4&lng=-70.6&z=9",
      "lat=-33.4&lng=-70.6&z=19",
      "lat=-33.4&lng=-70.6&z=1e1",
      "lat=-33.4;drop&lng=1",
    ]) {
      expect(leerPuntoMapa(url(q)), q).toBeNull();
    }
  });
});

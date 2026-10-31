import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MapaEstatico } from "@opai/ds";

import { urlMapaOpai } from "@/lib/mapa";

const html = (props: Parameters<typeof MapaEstatico>[0]) =>
  renderToStaticMarkup(createElement(MapaEstatico, props));

describe("mapa estático: estado de carga", () => {
  it("con imagen real, el primer pintado es un esqueleto sin retícula ni marcador", () => {
    const h = html({ lat: -33.4, lng: -70.6, fuente: urlMapaOpai, pie: "Providencia" });
    expect(h).toContain("ds-shimmer");
    expect(h).toContain('aria-busy="true"');
    expect(h).toContain("/api/geo/mapa?");
    expect(h).not.toContain("ds-mapa");
    expect(h).not.toContain("Providencia");
    expect(h).not.toContain("lucide-map-pin");
  });

  it("sin imagen (demo del DS) queda la retícula con el marcador, sin esqueleto", () => {
    const h = html({ lat: -33.4, lng: -70.6, pie: "Providencia" });
    expect(h).toContain("ds-mapa");
    expect(h).toContain("Providencia");
    expect(h).not.toContain("ds-shimmer");
  });

  it("sin coordenadas muestra el estado vacío del DS «Sin ubicación», no una caja gris", () => {
    const h = html({ lat: null, lng: null, fuente: urlMapaOpai });
    expect(h).toContain("Sin ubicación");
    expect(h).toContain('role="status"');
    expect(h).toContain("border-dashed");
    expect(h).toContain("lucide-map-pin");
    expect(h).not.toContain("bg-fill");
    expect(h).not.toContain("/api/geo/mapa?");
  });

  it("mientras se resuelve la dirección elegida (cargando) no dice «Sin ubicación»", () => {
    const h = html({ lat: null, lng: null, fuente: urlMapaOpai, cargando: true });
    expect(h).toContain("ds-shimmer");
    expect(h).toContain("Cargando ubicación");
    expect(h).not.toContain("Sin ubicación");
  });
});

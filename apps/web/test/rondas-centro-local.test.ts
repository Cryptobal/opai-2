import { afterEach, describe, expect, it, vi } from "vitest";

import { centroMapaInstalacion } from "@/app/(erp)/instalaciones/_componentes/rondas/datos-instalacion";

const fetchMock = vi.fn(() => { throw new Error("No se permite red en esta prueba"); });
afterEach(() => vi.unstubAllGlobals());
describe("centro de Rondas sin geocodificación externa", () => {
  it("usa coordenadas guardadas sin enviar la dirección", () => {
    vi.stubGlobal("fetch", fetchMock);
    const fixture = { nombre: "Instalación QA ficticia", lat: -34, lng: -71, direccionFormateada: "DIRECCION_FICTICIA_QA" };
    expect(centroMapaInstalacion(fixture)).toEqual({ lat: -34, lng: -71, etiqueta: fixture.nombre });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sin coordenadas usa Santiago como referencia local sin consultar dirección", () => {
    vi.stubGlobal("fetch", fetchMock);
    const fixture = { nombre: "Instalación QA ficticia", lat: null, lng: null, direccionFormateada: "DIRECCION_FICTICIA_QA" };
    expect(centroMapaInstalacion(fixture)).toEqual({ lat: -33.4489, lng: -70.6693, etiqueta: fixture.nombre });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

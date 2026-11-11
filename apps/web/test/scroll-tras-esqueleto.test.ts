import { describe, expect, it, vi } from "vitest";

import { contenedorDeScroll, subirTrasEsqueleto } from "@/lib/scroll-tras-esqueleto";

describe("scroll tras el esqueleto de navegación (CAR-231)", () => {
  it("sube al inicio cuando el esqueleto estuvo visible y la ruta cambió (lista a mitad de página)", () => {
    const ventana = { scrollTo: vi.fn() };
    expect(subirTrasEsqueleto(ventana, true, "/negocios", "/cotizaciones")).toBe(true);
    expect(ventana.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  });

  it("no toca el scroll si la navegación fue rápida (Next ya lo resolvió)", () => {
    const ventana = { scrollTo: vi.fn() };
    expect(subirTrasEsqueleto(ventana, false, "/a", "/b")).toBe(false);
    expect(ventana.scrollTo).not.toHaveBeenCalled();
  });

  it("no toca el scroll si la ruta no cambió (navegación cancelada o mismo destino)", () => {
    const ventana = { scrollTo: vi.fn() };
    expect(subirTrasEsqueleto(ventana, true, "/cotizaciones", "/cotizaciones")).toBe(false);
    expect(ventana.scrollTo).not.toHaveBeenCalled();
  });

  // CAR-317: en el marco Hilo desplaza el lienzo, no la ventana.
  it("dentro del marco Hilo sube el lienzo; fuera de él, la ventana", () => {
    const lienzo = { scrollTo: vi.fn() };
    const ventana = { scrollTo: vi.fn() };
    expect(contenedorDeScroll(() => lienzo, ventana)).toBe(lienzo);
    expect(contenedorDeScroll(() => null, ventana)).toBe(ventana);
  });
});

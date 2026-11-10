import { describe, expect, it, vi } from "vitest";

import { debeVolverArriba, volverArribaSiCorresponde } from "@/lib/scroll-tras-esqueleto";

describe("scroll tras el esqueleto de navegación (CAR-231)", () => {
  it("sube al inicio cuando el esqueleto estuvo visible y la ruta cambió (lista a mitad de página)", () => {
    const ventana = { scrollTo: vi.fn() };
    const subio = volverArribaSiCorresponde(ventana, {
      esqueletoVisible: true,
      inicio: "/negocios",
      actual: "/cotizaciones",
    });
    expect(subio).toBe(true);
    expect(ventana.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
  });

  it("no toca el scroll si la navegación fue rápida (Next ya lo resolvió)", () => {
    const ventana = { scrollTo: vi.fn() };
    expect(
      volverArribaSiCorresponde(ventana, { esqueletoVisible: false, inicio: "/a", actual: "/b" }),
    ).toBe(false);
    expect(ventana.scrollTo).not.toHaveBeenCalled();
  });

  it("no toca el scroll si la ruta no cambió (navegación cancelada o mismo destino)", () => {
    expect(debeVolverArriba({ esqueletoVisible: true, inicio: "/cotizaciones", actual: "/cotizaciones" })).toBe(false);
  });
});

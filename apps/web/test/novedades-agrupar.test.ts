import { describe, expect, it } from "vitest";

import { agruparNovedades, hoyEnChile } from "@/app/_components/novedades/agrupar-novedades";
import { moduloNovedad } from "@/app/_components/novedades/modulo-novedad";

describe("agrupar novedades por fecha (CAR-430)", () => {
  const items = [
    { id: "a", fecha: "2026-11-14" },
    { id: "b", fecha: "2026-11-12" },
    { id: "c", fecha: "2026-11-08" },
    { id: "d", fecha: "2026-10-01" },
  ];
  it("arma Hoy, Esta semana y Antes en el orden recibido", () => {
    const g = agruparNovedades(items, "2026-11-14");
    expect(g.map((x) => [x.titulo, x.items.map((i) => i.id)])).toEqual([
      ["Hoy", ["a"]],
      ["Esta semana", ["b", "c"]],
      ["Antes", ["d"]],
    ]);
  });
  it("omite los grupos vacíos", () => {
    expect(
      agruparNovedades([{ id: "x", fecha: "2026-01-01" }], "2026-11-14").map((g) => g.id),
    ).toEqual(["antes"]);
  });
  it("calcula hoy en la hora de Chile", () => {
    expect(hoyEnChile(new Date("2026-11-15T02:00:00Z"))).toBe("2026-11-14");
  });
});

describe("módulo visible de una novedad (CAR-430)", () => {
  it("sale de la pantalla a la que lleva, no de la sesión", () => {
    expect(moduloNovedad("/cargos", "Núcleo").etiqueta).toBe("Personas");
    expect(moduloNovedad("/finanzas/ventas", "Finanzas").etiqueta).toBe("Finanzas");
    expect(moduloNovedad("/configuracion/grupo/operacion", "Núcleo").etiqueta).toBe(
      "Configuración",
    );
  });
  it("sin ruta conocida usa el catálogo y nunca muestra «Núcleo»", () => {
    expect(moduloNovedad(null, "Núcleo").etiqueta).toBe("General");
    expect(moduloNovedad("/algo", "Comercial").etiqueta).toBe("Comercial");
  });
});

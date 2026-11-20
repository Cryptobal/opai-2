import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: Record<string, unknown>) => createElement("a", props, children as never),
}));
vi.mock("@/app/_components/use-capacidad", () => ({
  useCapacidad: () => ({ ejecutar: vi.fn(), pendiente: false, error: null }),
}));
vi.mock("@/app/(erp)/finanzas/flujo/_componentes/datos", () => ({ fechaDdMmAaaa: (f: string) => f }));

import { ListaDescartes } from "@/app/(erp)/finanzas/bancos/importaciones/_componentes/lista-descartes";

const descarte = {
  id: "sintetico", desde: "2026-11-01", hasta: "2026-11-02", origen: "manual", motivo: "Prueba",
  movimientos: 1, descartadoEn: "2026-11-03T12:00:00Z", restauradoEn: null,
};

describe("ListaDescartes: navegación visible y recuperación", () => {
  it("expone la siguiente página junto al botón Restaurar", () => {
    const html = renderToStaticMarkup(createElement(ListaDescartes, {
      descartes: [descarte], gestiona: true, siguienteHref: "/finanzas/bancos/importaciones?cursorDescartes=20", inicioHref: null,
    }));
    expect(html).toContain("Restaurar");
    expect(html).toContain('href="/finanzas/bancos/importaciones?cursorDescartes=20"');
    expect(html).toContain("Ver descartes anteriores");
  });

  it("permite volver aunque la página antigua haya quedado vacía", () => {
    const html = renderToStaticMarkup(createElement(ListaDescartes, {
      descartes: [], gestiona: false, siguienteHref: null, inicioHref: "/finanzas/bancos/importaciones?cuenta=sintetica",
    }));
    expect(html).toContain("Volver a los más recientes");
    expect(html).toContain('href="/finanzas/bancos/importaciones?cuenta=sintetica"');
    expect(html).not.toContain("Ver descartes anteriores");
  });
});

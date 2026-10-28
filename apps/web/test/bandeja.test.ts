import { createElement } from "react";
import type * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  valores: [] as unknown[], efectos: [] as (() => void)[], ejecutar: vi.fn(),
}));
vi.mock("react", async (importar) => ({
  ...await importar<typeof React>(),
  useState: (inicial: unknown) => [h.valores.length ? h.valores.shift() : inicial, vi.fn()],
  useEffect: (f: () => void) => h.efectos.push(f),
}));
vi.mock("@/app/_acciones/capacidad", () => ({ ejecutarCapacidad: h.ejecutar }));
import { Bandeja } from "@/app/(erp)/_componentes/bandeja";

beforeEach(() => { h.valores = []; h.efectos = []; h.ejecutar.mockReset(); });

it("muestra el total real de 80 avisos, conserva destinos y ofrece cargar el resto", () => {
  h.valores = [[{ id: "aviso", titulo: "Abrir ficha", cuerpo: null, enlace: "/cuentas",
    leidaEn: null, creadaEn: "2026-10-27T00:00:00.000Z" }], 2, [], false, 80, false];
  const html = renderToStaticMarkup(createElement(Bandeja));
  expect(html).toContain("Bandeja · 82");
  expect(html).toContain('href="/cuentas"');
  expect(html).toContain("Cargar más avisos");
});

for (const rol of ["viewer", "supervisor", "owner"]) {
  it(`${rol}: solo consulta aprobaciones si el resumen de servidor las autoriza`, async () => {
    h.ejecutar.mockImplementation(async (_portal: string, id: string) => {
      if (id === "core.notificaciones.list") return { ok: true, data: { items: [], noLeidas: 0 } };
      if (id === "core.resumen.contadores") return { ok: true, data: {
        aprobacionesPendientes: rol === "owner" ? 2 : null,
      } };
      return { ok: true, data: [] };
    });
    renderToStaticMarkup(createElement(Bandeja));
    h.efectos[0]?.();
    await vi.waitFor(() => expect(h.ejecutar.mock.calls.length).toBe(rol === "owner" ? 3 : 2));
    expect(h.ejecutar.mock.calls.some((c) => c[1] === "core.aprobaciones.list")).toBe(rol === "owner");
  });
}

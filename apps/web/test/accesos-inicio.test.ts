import { describe, expect, it } from "vitest";

import { juntarAccesos, ofreceEditar } from "../app/(erp)/_componentes/accesos-armar";
import { armarIndicadores } from "../app/(erp)/_componentes/indicadores-armar";

const item = (href: string) => ({ href, etiqueta: href });

describe("Inicio · tus accesos", () => {
  it("fijados primero, recientes después, sin repetir y hasta cinco", () => {
    const r = juntarAccesos(
      [item("/a"), item("/b")],
      [item("/b"), item("/c"), item("/d"), item("/e"), item("/f")],
    );
    expect(r.map((x) => x.href)).toEqual(["/a", "/b", "/c", "/d", "/e"]);
  });
  it("Inicio comparte la regla de «Más»: no repite destino ni nombre (CAR-224)", () => {
    const r = juntarAccesos(
      [{ href: "/cotizaciones", etiqueta: "Cotizaciones" }],
      [
        { href: "/cotizaciones/", etiqueta: "Cotizaciones" },
        { href: "/cotizaciones/abc", etiqueta: "Cotizaciones" },
        { href: "/solicitudes", etiqueta: "Solicitudes" },
      ],
    );
    expect(r.map((x) => x.etiqueta)).toEqual(["Cotizaciones", "Solicitudes"]);
  });
  it("sin nada, lista vacía", () => {
    expect(juntarAccesos([], [])).toEqual([]);
  });
  it("mientras hidrata no ofrece «Editar», aunque el shell ya haya entregado los fijados", () => {
    // El HTML del servidor no conoce los fijados: ofrecer «Editar» al hidratar rompe la hidratación.
    expect(ofreceEditar(false, true, false)).toBe(false);
  });
  it("ya en el navegador ofrece «Editar» si hay algo que fijar o desfijar, o si se está editando", () => {
    expect(ofreceEditar(true, true, false)).toBe(true);
    expect(ofreceEditar(true, false, true)).toBe(true);
    expect(ofreceEditar(true, false, false)).toBe(false);
  });
});

describe("Inicio · cada indicador lleva a su lista", () => {
  it("cobertura, negocios, facturado y tickets enlazan a Pauta, Negocios, Ventas y Tickets", () => {
    const t = armarIndicadores(
      {
        cobertura: { fecha: "2026-11-04", programados: 10, cubiertos: 9, ppc: 1, cobertura: 90 },
        negocios: { cantidad: 2, valorMensualClp: 1000, valorMensualUf: null },
        cotizacionesPorAprobar: null,
        facturado: { periodo: "2026-11", hastaDia: 4, netoClp: 10, netoMesAnteriorClp: 5 },
        tickets: { abiertos: 3, asignadosAMi: 1 },
      },
      1000,
    );
    expect(Object.fromEntries(t.map((x) => [x.id, x.href]))).toEqual({
      cobertura: "/pauta",
      negocios: "/negocios",
      facturado: "/finanzas/ventas",
      tickets: "/tickets",
    });
  });
});

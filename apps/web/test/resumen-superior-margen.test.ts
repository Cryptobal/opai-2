import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ResumenSuperior } from "@/app/(erp)/cotizaciones/[id]/_componentes/resumen-superior";
import type { ParametrosVersion } from "@/app/(erp)/cotizaciones/[id]/_componentes/margen-form";

const base: ParametrosVersion = {
  mesesContrato: 12,
  mesesPactados: false,
  margenModo: "margen_sobre_venta",
  margenObjetivoPct: 200_000,
  margenMinimoPct: null,
  margenAlertaPct: null,
  sobrescrito: false,
  instrumentos: {
    financiero: { habilitado: false, tasaPct: 0 },
    garantia: { habilitada: false, meses: 0, tasaAnualPct: 0, contratoPct: 0 },
    rc: { habilitada: false, tasaAnualPct: 0 },
  },
};

const html = (parametros: ParametrosVersion) =>
  renderToStaticMarkup(
    createElement(ResumenSuperior, {
      calculo: { ventaMensual: 1_000_000, semaforo: "rojo", margenEfectivoPct: 80_000 },
      meta: undefined,
      parametros,
      puestos: 1,
      acciones: null,
    }),
  );

describe("resumen superior con márgenes sin configurar (CAR-192)", () => {
  it("sin mínimo: muestra el margen, sin «Mínimo 0 %», sin barra y sin semáforo", () => {
    const h = html(base);
    expect(h).toContain("8.0 %");
    expect(h).not.toContain("Mínimo");
    expect(h).not.toContain('role="img"');
    expect(h).not.toContain("Bajo el mínimo");
    expect(h).toContain("objetivo 20 %");
  });

  it("con mínimo configurado: barra, mínimo y semáforo como antes", () => {
    const h = html({ ...base, margenMinimoPct: 100_000 });
    expect(h).toContain("Mínimo 10 %");
    expect(h).toContain('role="img"');
    expect(h).toContain("Bajo el mínimo");
  });
});

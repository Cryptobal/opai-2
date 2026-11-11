import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EncabezadoInicio } from "@/app/(erp)/_componentes/encabezado-inicio";

const base = {
  nombre: "Camilo Ibarra",
  empresa: "Gard Security",
  ahora: new Date("2026-11-11T19:00:00Z"),
  crear: createElement("span", null, "Crear"),
};

describe("encabezado de Inicio según el marco", () => {
  it("en el marco clásico saluda con el nombre de pila", () => {
    const h = renderToStaticMarkup(createElement(EncabezadoInicio, { ...base, hilo: false }));
    expect(h).toContain("Buenas tardes, Camilo");
    expect(h).toContain("Gard Security");
    expect(h).toContain("Crear");
  });

  it("en el marco Hilo no repite el saludo del hilo: quedan la fecha y Crear", () => {
    const h = renderToStaticMarkup(createElement(EncabezadoInicio, { ...base, hilo: true }));
    expect(h).not.toContain("Camilo");
    expect(h).toContain("11-11-2026");
    expect(h).toContain("Crear");
  });
});

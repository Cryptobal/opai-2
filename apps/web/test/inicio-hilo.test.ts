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

  it("en el marco Hilo el saludo se oculta solo dentro del marco: quedan la fecha y Crear", () => {
    const h = renderToStaticMarkup(createElement(EncabezadoInicio, { ...base, hilo: true }));
    // Sigue en el marcado, oculto por CSS dentro del marco Hilo: en el clásico nunca falta.
    expect(h).toMatch(/<h2 class="[^"]*marco-hilo:hidden[^"]*">.*Camilo/);
    expect(h).toContain("11-11-2026");
    expect(h).toContain("Crear");
  });
});

describe("rejilla de Inicio según el marco", () => {
  it("en el marco clásico conserva la columna lateral de 380 px", async () => {
    const { rejillaInicio } = await import("@/app/(erp)/_componentes/rejilla-inicio");
    expect(rejillaInicio(false).rejilla).toContain("xl:grid-cols-[minmax(0,1fr)_380px]");
    expect(rejillaInicio(false).decision).toContain("lg:col-start-1");
  });

  it("en el marco Hilo no deja una columna vacía: sin decisión y con colocación automática", async () => {
    const { rejillaInicio } = await import("@/app/(erp)/_componentes/rejilla-inicio");
    const r = rejillaInicio(true);
    expect(r.rejilla).not.toContain("380px");
    // Lo que requiere decisión se oculta con CSS dentro del marco, no se deja de pintar.
    expect(r.decision).toContain("marco-hilo:hidden");
    expect(rejillaInicio(false).decision).not.toContain("marco-hilo:hidden");
    for (const bloque of [r.tareas, r.accesos, r.seguimientos, r.actividad]) {
      expect(bloque).not.toMatch(/col-start|row-start/);
      expect(bloque).toContain("empty:hidden");
    }
  });
});

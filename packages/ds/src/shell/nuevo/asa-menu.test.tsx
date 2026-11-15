import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ANCHO_BASE, ANCHO_MAX, ANCHO_MIN, alSoltar, anchoValido } from "./asa-menu";
import { ShellNuevo } from "./shell-nuevo";

describe("ancho del menú del diseño nuevo (CAR-442)", () => {
  it("el ancho queda entre 200 y 330 px", () => {
    expect(anchoValido(100)).toBe(ANCHO_MIN);
    expect(anchoValido(999)).toBe(ANCHO_MAX);
    expect(anchoValido(281.4)).toBe(281);
    expect(anchoValido(Number.NaN)).toBe(ANCHO_BASE);
  });

  it("soltar el borde muy a la izquierda pliega el menú; si no, fija el ancho", () => {
    expect(alSoltar(80)).toEqual({ plegar: true });
    expect(alSoltar(150)).toEqual({ plegar: false, ancho: ANCHO_MIN });
    expect(alSoltar(300)).toEqual({ plegar: false, ancho: 300 });
  });

  it("el shell pinta el ancho guardado y el borde para arrastrar solo con el menú fijo", () => {
    const base = {
      titulo: "Inicio",
      nav: [],
      rutaActual: "/",
      portales: [{ id: "erp", etiqueta: "ERP", href: "/" }],
      portalActual: "erp",
      children: <p>contenido</p>,
    };
    const fijo = renderToStaticMarkup(<ShellNuevo {...base} anchoInicial={300} />);
    expect(fijo).toContain("--ancho-menu:300px");
    expect(fijo).toContain('aria-label="Cambiar el ancho del menú"');
    const plegado = renderToStaticMarkup(<ShellNuevo {...base} plegadoInicial />);
    expect(plegado).not.toContain('aria-label="Cambiar el ancho del menú"');
  });
});

describe("teclado del borde del menú (CAR-442)", () => {
  it("flechas de a 16 px, Inicio y Fin a los límites, Enter al ancho base", async () => {
    const { anchoPorTecla } = await import("./asa-menu");
    expect(anchoPorTecla("ArrowRight", 248)).toBe(264);
    expect(anchoPorTecla("ArrowLeft", 208)).toBe(ANCHO_MIN);
    expect(anchoPorTecla("Home", 300)).toBe(ANCHO_MIN);
    expect(anchoPorTecla("End", 300)).toBe(ANCHO_MAX);
    expect(anchoPorTecla("Enter", 300)).toBe(ANCHO_BASE);
    expect(anchoPorTecla("a", 300)).toBeUndefined();
  });
});

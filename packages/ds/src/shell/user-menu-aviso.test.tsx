import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MenuUsuarioBarra } from "./user-menu";

const usuario = { nombre: "Persona Prueba", email: "persona@ejemplo.cl" };
const items = [{ id: "novedades", etiqueta: "Novedades", contador: 2, onSelect: () => undefined }];

describe("punto de novedades sobre el avatar (CAR-316)", () => {
  it("con novedades sin leer el avatar lleva el punto rojo y lo anuncia", () => {
    const html = renderToStaticMarkup(
      <MenuUsuarioBarra usuario={{ ...usuario, aviso: true }} menuUsuario={items} />,
    );
    expect(html).toContain("bg-danger-fg");
    expect(html).toContain('aria-label="Menú de usuario, hay novedades sin leer"');
  });

  it("sin aviso el avatar queda limpio", () => {
    const html = renderToStaticMarkup(<MenuUsuarioBarra usuario={usuario} menuUsuario={items} />);
    expect(html).not.toContain("bg-danger-fg");
    expect(html).toContain('aria-label="Menú de usuario"');
  });
});

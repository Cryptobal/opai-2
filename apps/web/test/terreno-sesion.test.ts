import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AvisoTerrenoConSesion } from "@/app/(terreno)/terreno/_componentes/aviso-sesion";

const html = (puedeDispositivos: boolean) =>
  renderToStaticMarkup(createElement(AvisoTerrenoConSesion, { puedeDispositivos }));

describe("Terreno con sesión (CAR-527)", () => {
  it("explica el equipo emparejado y no dice que está en construcción", () => {
    const marcado = html(true);
    expect(marcado).toContain(
      "Terreno se usa en el teléfono o la tablet de la instalación, en el equipo emparejado.",
    );
    expect(marcado).not.toContain("en construcción");
    expect(marcado).not.toContain("fase de portales");
  });

  it("enlaza los dispositivos de la instalación y el emparejar de este teléfono", () => {
    const marcado = html(true);
    expect(marcado).toContain('href="/instalaciones"');
    expect(marcado).toContain("Dispositivos de instalaciones");
    expect(marcado).toContain('href="/terreno/emparejar"');
    expect(marcado).toContain("Emparejar este teléfono");
  });

  it("sin permiso de instalaciones deja solo el emparejar de este teléfono", () => {
    const marcado = html(false);
    expect(marcado).not.toContain('href="/instalaciones"');
    expect(marcado).toContain('href="/terreno/emparejar"');
  });
});

import { Building2 } from "lucide-react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AreaGrupo } from "./area-grupo";
import { BotonFijar } from "./boton-fijar";
import { BottomNav } from "./nav";
import { agrupar } from "./sidebar-item";

describe("navegación por áreas del DS", () => {
  it("acordeón cerrado: aria-expanded e inert impiden focos invisibles", () => {
    const html = renderToStaticMarkup(
      <AreaGrupo
        etiqueta="Clientes"
        icono={Building2}
        abierto={false}
        activa={false}
        onAlternar={() => undefined}
      >
        <a href="/cuentas">Cuentas</a>
      </AreaGrupo>,
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('inert=""');
    expect(html).toContain('aria-hidden="true"');
  });
  it("pin es un botón con nombre accesible y variante de ficha permanente", () => {
    expect(renderToStaticMarkup(<BotonFijar fijado onFijar={() => undefined} />)).toContain(
      'aria-label="Desfijar"',
    );
    expect(
      renderToStaticMarkup(
        <BotonFijar variante="ficha" fijado={false} onFijar={() => undefined} />,
      ),
    ).toContain('aria-pressed="false"');
  });
  it("punto en Inicio no imprime un contador numérico", () => {
    const html = renderToStaticMarkup(
      <BottomNav
        rutaActual="/"
        items={[
          {
            href: "/",
            etiqueta: "Inicio",
            icono: Building2,
            punto: true,
            alerta: true,
            contador: 99,
          },
        ]}
      />,
    );
    expect(html).not.toContain(">99<");
  });
  it("mantiene el orden de áreas agrupadas y sueltas", () => {
    const items = [
      { href: "/", etiqueta: "Inicio", icono: Building2 },
      { href: "/cuentas", etiqueta: "Cuentas", grupo: "Clientes", icono: Building2 },
      { href: "/personas", etiqueta: "Personas", grupo: "Personas", icono: Building2 },
      { href: "/documentos", etiqueta: "Documentos", grupo: "Documentos", icono: Building2 },
    ];
    expect(agrupar(items).map(([g]) => g)).toEqual(["", "Clientes", "Personas", "Documentos"]);
  });
});

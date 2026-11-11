import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ListScreen } from "./list-screen";

type Fila = { id: string; nombre: string };
const items: Fila[] = [{ id: "1", nombre: "CAF 33" }];

function pintar(extra: { sinCabecera?: boolean; accion?: boolean; items?: Fila[] }) {
  return renderToStaticMarkup(
    <ListScreen<Fila>
      state="ready"
      titulo="Folios"
      {...(extra.sinCabecera ? { sinCabecera: true } : {})}
      {...(extra.accion ? { accionPrincipal: <button type="button">Subir CAF</button> } : {})}
      items={extra.items ?? items}
      clave={(f) => f.id}
      tarjeta={(f) => <span>{f.nombre}</span>}
      columnas={[{ id: "n", etiqueta: "Nombre", render: (f) => f.nombre }]}
    />,
  );
}

describe("ListScreen · acción principal", () => {
  it("sinCabecera con ítems: la acción principal se sigue viendo (no depende de la cabecera)", () => {
    const html = pintar({ sinCabecera: true, accion: true });
    expect(html).toContain("Subir CAF");
    expect(html).not.toContain("<h1");
  });

  it("con cabecera, la acción sigue en la cabecera", () => {
    expect(pintar({ accion: true })).toContain("Subir CAF");
  });

  it("sin acción no aparece nada", () => {
    expect(pintar({ sinCabecera: true })).not.toContain("Subir CAF");
  });

  it("las acciones de la fila quedan fuera del enlace estirado", () => {
    const html = renderToStaticMarkup(
      <ListScreen<Fila>
        state="ready"
        titulo="Documentos"
        items={items}
        clave={(f) => f.id}
        href={() => "/documentos?ver=1"}
        tarjeta={(f) => <span>{f.nombre}</span>}
        columnas={[{ id: "n", etiqueta: "Nombre", render: (f) => f.nombre }]}
        acciones={() => <button type="button">Archivar</button>}
      />,
    );
    const movil = html.slice(html.indexOf("<ul"), html.indexOf("</ul>"));
    const tabla = html.slice(html.indexOf("<table"), html.indexOf("</table>"));
    for (const parte of [movil, tabla]) {
      const fueraDelEnlace = parte.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, "");
      expect(fueraDelEnlace).toContain("Archivar");
    }
  });
});

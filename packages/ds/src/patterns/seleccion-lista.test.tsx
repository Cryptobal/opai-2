import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ListScreen } from "./list-screen";
import { seleccionDeLista } from "./seleccion";

type Fila = { id: string; nombre: string };
const items: Fila[] = [
  { id: "1", nombre: "Logística Andina" },
  { id: "2", nombre: "Minera Sur" },
];

const pintar = (seleccion: boolean) =>
  renderToStaticMarkup(
    <ListScreen<Fila>
      state="ready"
      titulo="Cuentas"
      items={items}
      clave={(f) => f.id}
      tarjeta={(f) => <span>{f.nombre}</span>}
      columnas={[{ id: "n", etiqueta: "Nombre", render: (f) => f.nombre }]}
      href={(f) => `/cuentas/${f.id}`}
      {...(seleccion
        ? {
            seleccion: seleccionDeLista<Fila>(
              (f) => f.id,
              (f) => f.nombre,
              <span>Archivar</span>,
            ),
          }
        : {})}
    />,
  );

describe("ListScreen · selección de varias filas (CAR-335 D4a)", () => {
  it("con selección: casilla de todas y una por fila, con nombre accesible", () => {
    const html = pintar(true);
    expect(html).toContain('aria-label="Seleccionar todas las filas"');
    expect(html).toContain('aria-label="Seleccionar Logística Andina"');
    expect(html).toContain('aria-label="Seleccionar Minera Sur"');
  });

  it("sin nada elegido la barra no aparece", () => {
    expect(pintar(true)).not.toContain("filas seleccionadas");
  });

  it("sin selección la lista queda como antes", () => {
    expect(pintar(false)).not.toContain("Seleccionar");
  });
});

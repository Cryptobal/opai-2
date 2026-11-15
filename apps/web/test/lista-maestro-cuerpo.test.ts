import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, className, children, ...rest }: Record<string, unknown>) =>
    createElement("a", { href, className, ...rest }, children as never),
}));
vi.mock("@/app/_components/estado-enlace", () => ({
  EstadoEnlace: () => null,
}));

import { CuerpoListaMaestro } from "@/app/_components/maestros/cuerpo-lista-maestro";
import { ListaMaestroSplit } from "@/app/_components/maestros/lista-maestro-split";

const filas = [
  {
    id: "c1",
    href: "/contactos/c1",
    titulo: "Ana Rojas",
    secundario: "ana@ejemplo.cl",
  },
];

describe("lista maestro cuerpo compartido (CAR-439)", () => {
  it("CuerpoListaMaestro marca la fila seleccionada y el vacío", () => {
    const conFilas = renderToStaticMarkup(
      createElement(CuerpoListaMaestro, {
        state: "ready",
        filas,
        vacio: { titulo: "Sin contactos" },
        seleccionada: "c1",
        meta: { izquierda: "1 contacto" },
      }),
    );
    expect(conFilas).toContain("Ana Rojas");
    expect(conFilas).toContain("/contactos/c1");
    expect(conFilas).toContain("aria-current=\"page\"");
    expect(conFilas).toContain("1 contacto");

    const vacia = renderToStaticMarkup(
      createElement(CuerpoListaMaestro, {
        state: "ready",
        filas: [],
        vacio: { titulo: "Sin contactos", descripcion: "Crea el primero" },
      }),
    );
    expect(vacia).toContain("Sin contactos");
    expect(vacia).toContain("Crea el primero");
  });

  it("ListaMaestroSplit reutiliza el cuerpo (fila y vacío)", () => {
    const html = renderToStaticMarkup(
      createElement(ListaMaestroSplit, {
        state: "ready",
        titulo: "Contactos",
        filas,
        vacio: { titulo: "Sin contactos" },
        seleccionada: "c1",
      }),
    );
    expect(html).toContain("Contactos");
    expect(html).toContain("Ana Rojas");
    expect(html).toContain("aria-current=\"page\"");
  });
});

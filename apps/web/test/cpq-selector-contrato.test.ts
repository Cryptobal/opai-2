import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Campo, Combobox } from "@opai/ds";

it("el label de cotización apunta al botón inicial, no a un combobox descendiente", () => {
  const campo = {
    etiqueta: "Ver con la cotización", htmlFor: "vista-cpq",
    children: createElement(Combobox, {
      id: "vista-cpq", opciones: [], valor: null, onCambiar: () => {},
      placeholder: "Elige una cotización",
    }),
  };
  const html = renderToStaticMarkup(createElement(Campo, campo));
  expect(html).toContain('for="vista-cpq"');
  expect(html).toMatch(/<button[^>]*id="vista-cpq"/);
  expect(html).not.toContain('role="combobox"');
  expect(html).not.toContain("<input");
});

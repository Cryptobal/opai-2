import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BarraHilo } from "./barra";

const nada = () => undefined;

// Maqueta de teléfono: «Pide o busca algo en OPAI»; el texto largo se cortaba a 375 px (CAR-317).
describe("Barra del hilo", () => {
  it("con texto corto, el teléfono ve el corto y desde 640 px el largo", () => {
    const h = renderToStaticMarkup(
      <BarraHilo
        agente
        texto="Pide, pregunta o busca una pantalla"
        textoCorto="Pide o busca algo en OPAI"
        onBuscar={nada}
      />,
    );
    expect(h).toMatch(/<span class="[^"]*sm:hidden[^"]*">Pide o busca algo en OPAI<\/span>/);
    expect(h).toMatch(
      /<span class="[^"]*hidden[^"]*sm:block[^"]*">Pide, pregunta o busca una pantalla<\/span>/,
    );
  });
  it("sin texto corto, el mismo texto en todos los anchos", () => {
    const h = renderToStaticMarkup(
      <BarraHilo agente={false} texto="Busca una pantalla o un registro" onBuscar={nada} />,
    );
    expect(h.match(/Busca una pantalla o un registro/g)).toHaveLength(1);
    expect(h).not.toContain("sm:hidden");
  });
});

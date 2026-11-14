import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LineaSaldo } from "./linea-saldo";

const puntos = [
  { etiqueta: "S1", valor: 10, texto: "$ 10" },
  { etiqueta: "S2", valor: -5, texto: "−$ 5", tono: "peligro" as const },
  { etiqueta: "S3", valor: 3, texto: "$ 3", tono: "alerta" as const },
];

describe("LineaSaldo (CAR-398)", () => {
  it("dibuja la línea, pinta los tramos con tono y deja los valores en una lista para lectores de pantalla", () => {
    const html = renderToStaticMarkup(<LineaSaldo etiqueta="Saldo" puntos={puntos} umbral={{ valor: 4, texto: "$ 4" }} />);
    expect(html).toContain('aria-label="Saldo"');
    expect(html).toContain("text-danger-fg");
    expect(html).toContain("text-warning-fg");
    expect(html).toContain("S2: −$ 5");
    expect(html).toContain("Umbral $ 4");
  });
  it("sin puntos no dibuja nada; con uno solo no divide por cero", () => {
    expect(renderToStaticMarkup(<LineaSaldo etiqueta="Saldo" puntos={[]} />)).toBe("");
    expect(renderToStaticMarkup(<LineaSaldo etiqueta="Saldo" puntos={[puntos[0]!]} />)).not.toContain("NaN");
  });
});

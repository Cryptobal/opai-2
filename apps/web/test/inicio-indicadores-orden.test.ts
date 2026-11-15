import { describe, expect, it } from "vitest";

import { ordenarTarjetas, type Tarjeta } from "@/app/(erp)/_componentes/indicadores-armar";

const t = (id: string): Tarjeta => ({ id, etiqueta: id, href: `/${id}`, valor: "1" });

describe("indicadores de Inicio en el orden de la empresa (CAR-335 D3)", () => {
  it("deja solo las elegidas, en su orden", () => {
    const r = ordenarTarjetas(
      [t("cobertura"), t("negocios"), t("tickets")],
      ["tickets", "cobertura"],
    );
    expect(r.map((x) => x.id)).toEqual(["tickets", "cobertura"]);
  });

  it("sin orden (respuesta antigua) las deja como vienen", () => {
    expect(ordenarTarjetas([t("a"), t("b")], undefined).map((x) => x.id)).toEqual(["a", "b"]);
  });
});

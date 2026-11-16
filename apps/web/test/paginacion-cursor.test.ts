import { describe, expect, it } from "vitest";

import { anterioresDe, queryLista, tamanoPagina } from "@/app/_components/maestros/paginacion-cursor";

describe("paginacion cursor (CAR-585)", () => {
  it("lee el tamaño de página permitido", () => {
    expect(tamanoPagina({})).toBe(20);
    expect(tamanoPagina({ limite: "50" })).toBe(50);
    expect(tamanoPagina({ limite: "99" })).toBe(20);
  });

  it("arma la pila prev y el query", () => {
    expect(anterioresDe({ prev: "a,b" })).toEqual(["a", "b"]);
    expect(queryLista({ q: "hola", cursor: "x" }, { cursor: null })).toBe("?q=hola");
  });
});
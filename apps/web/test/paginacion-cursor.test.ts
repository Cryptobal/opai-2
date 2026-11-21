import { describe, expect, it } from "vitest";

import {
  anteriores,
  entradaPaginaLista,
  queryConCambios,
  tamanoPagina,
} from "@/app/_components/maestros/paginacion-cursor";

describe("paginacion cursor (CAR-585)", () => {
  it("lee el tamaño de página permitido", () => {
    expect(tamanoPagina({})).toBe(50);
    expect(tamanoPagina({ limite: "50" })).toBe(50);
    expect(tamanoPagina({ limite: "99" })).toBe(50);
  });

  it("entradaPaginaLista incluye cursor válido", () => {
    expect(entradaPaginaLista({})).toEqual({ limite: 20 });
    expect(entradaPaginaLista({ limite: "50", cursor: "no-uuid" })).toEqual({ limite: 50 });
    expect(entradaPaginaLista({ cursor: "00000000-0000-4000-8000-000000000001" })).toEqual({
      limite: 20,
      cursor: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("arma la pila prev y el query", () => {
    expect(anteriores({ prev: "a,b" })).toEqual(["a", "b"]);
    expect(queryConCambios({ q: "hola", cursor: "x" }, { cursor: null })).toBe("?q=hola");
  });
});
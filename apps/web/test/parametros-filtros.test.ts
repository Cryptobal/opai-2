import { describe, expect, it } from "vitest";

import { conFiltros } from "@/lib/parametros";

describe("conFiltros (CAR-325)", () => {
  it("conserva estado, búsqueda, instalaciones y etiqueta al abrir otra ficha", () => {
    const url = conFiltros("/cuentas/abc", { estado: "cliente_activo", q: "mall", con: "si", etiqueta: "e1" });
    expect(new URL(url, "https://x").searchParams.get("estado")).toBe("cliente_activo");
    expect(new URL(url, "https://x").searchParams.get("q")).toBe("mall");
    expect(new URL(url, "https://x").searchParams.get("con")).toBe("si");
    expect(new URL(url, "https://x").searchParams.get("etiqueta")).toBe("e1");
  });

  it("sin filtros devuelve la ruta tal cual", () => {
    expect(conFiltros("/cuentas/abc")).toBe("/cuentas/abc");
    expect(conFiltros("/cuentas/abc", {})).toBe("/cuentas/abc");
  });

  it("no arrastra parámetros que no son de la lista (nueva, editar)", () => {
    expect(conFiltros("/cuentas/abc", { nueva: "1", editar: "1", estado: "cliente_inactivo" })).toBe(
      "/cuentas/abc?estado=cliente_inactivo",
    );
  });

  it("codifica la búsqueda", () => {
    expect(conFiltros("/cuentas", { q: "a b&c" })).toBe("/cuentas?q=a+b%26c");
  });
});

import { describe, expect, it } from "vitest";

import { conFiltros } from "@/app/(erp)/finanzas/ventas/_componentes/filtros-url";

describe("conFiltros (CAR-255)", () => {
  it("sin filtros deja la ruta tal cual", () => {
    expect(conFiltros("/finanzas/ventas", {})).toBe("/finanzas/ventas");
  });

  it("conserva filtros y paginación; descarta editar (CAR-585)", () => {
    const r = conFiltros("/finanzas/ventas/x", {
      periodo: "2026-10",
      estado: "borrador",
      q: "ñandú 1",
      cursor: "abc",
      prev: "0,def",
      limite: "50",
      editar: "1",
    });
    const q = new URL(r, "http://x").searchParams;
    expect(r.startsWith("/finanzas/ventas/x?")).toBe(true);
    expect([...q.keys()].sort()).toEqual(["cursor", "estado", "limite", "periodo", "prev", "q"]);
    expect(q.get("q")).toBe("ñandú 1");
  });

  it("conserva también el tipo y el orden del libro (CAR-270)", () => {
    expect(conFiltros("/f", { tipo: "61", orden: "mayor_monto", cursor: "x" })).toBe(
      "/f?tipo=61&orden=mayor_monto&cursor=x",
    );
  });

  it("agrega parámetros extra sin perder los filtros", () => {
    expect(conFiltros("/f", { estado: "aceptado" }, { editar: "1" })).toBe("/f?estado=aceptado&editar=1");
  });

  it("ignora valores vacíos", () => {
    expect(conFiltros("/f", { periodo: "", q: undefined })).toBe("/f");
  });
});

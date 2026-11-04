import { expect, it } from "vitest";

import { busquedaSchema, escaparComodines, filtroTitulo } from "./conversaciones-busqueda";

it("recorta el texto y acepta vacío como «sin búsqueda»", () => {
  expect(busquedaSchema.parse("  turnos  ")).toBe("turnos");
  expect(busquedaSchema.parse("   ")).toBe("");
});

it("exige 2 caracteres si no está vacío y como máximo 120", () => {
  expect(busquedaSchema.safeParse("a").success).toBe(false);
  expect(busquedaSchema.safeParse(" a ").success).toBe(false);
  expect(busquedaSchema.safeParse("ab").success).toBe(true);
  expect(busquedaSchema.safeParse("x".repeat(120)).success).toBe(true);
  expect(busquedaSchema.safeParse("x".repeat(121)).success).toBe(false);
});

it("escapa \\, % y _ para que sean literales", () => {
  expect(escaparComodines("50%_a\\b")).toBe("50\\%\\_a\\\\b");
  expect(escaparComodines("normal")).toBe("normal");
});

it("el filtro es vacío sin texto y usa contains insensible con el texto escapado", () => {
  expect(filtroTitulo(undefined)).toEqual({});
  expect(filtroTitulo("  ")).toEqual({});
  expect(filtroTitulo("a_b")).toEqual({
    titulo: { contains: "a\\_b", mode: "insensitive" },
  });
});

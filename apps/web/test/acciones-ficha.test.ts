import { expect, it } from "vitest";

import { accionesSinEditar, fichaAccionesEnCabecera, raizDeFicha } from "@/app/_components/maestros/ficha-ruta";

it("normaliza la raíz de ficha con pestaña", () => {
  const id = "00000000-0000-4000-8000-000000000099";
  expect(raizDeFicha(`/cuentas/${id}/contactos`)).toBe(`/cuentas/${id}`);
  expect(raizDeFicha(`/personas/${id}/laboral`)).toBe(`/personas/${id}`);
  expect(raizDeFicha("/cuentas")).toBeNull();
});

it("marca pilotos con acciones en la cabecera de la ficha", () => {
  const id = "00000000-0000-4000-8000-000000000099";
  expect(fichaAccionesEnCabecera(`/cuentas/${id}/documentos`)).toBe(true);
  expect(fichaAccionesEnCabecera(`/instalaciones/${id}`)).toBe(false);
});

it("filtra editar del menú secundario", () => {
  const base = [
    { id: "editar", etiqueta: "Editar datos", parametro: { clave: "editar", valor: "1" } },
    { id: "archivar", etiqueta: "Archivar", capacidad: { id: "x", input: {}, exito: "ok" } },
  ];
  expect(accionesSinEditar(base).map((a) => a.id)).toEqual(["archivar"]);
});
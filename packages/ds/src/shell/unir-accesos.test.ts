import { describe, expect, it } from "vitest";

import { canonicalizarReciente, normalizarHref, unirAccesos } from "./unir-accesos";

const a = (href: string, etiqueta: string) => ({ href, etiqueta });
const menu = [a("/", "Inicio"), a("/cotizaciones", "Cotizaciones"), a("/personas", "Personas")];

describe("normalizarHref", () => {
  it("quita barra final, query y hash; la raíz queda como «/»", () => {
    expect(normalizarHref("/cotizaciones/")).toBe("/cotizaciones");
    expect(normalizarHref("/solicitudes?estado=abiertas#x")).toBe("/solicitudes");
    expect(normalizarHref("/")).toBe("/");
    expect(normalizarHref("")).toBe("/");
  });
});

describe("unirAccesos (CAR-224)", () => {
  it("un fijado y un reciente del mismo destino (aunque difieran en la barra final) salen una vez", () => {
    const r = unirAccesos([a("/cotizaciones", "Cotizaciones")], [a("/cotizaciones/", "Cotizaciones")], 4);
    expect(r.map((x) => x.href)).toEqual(["/cotizaciones"]);
  });
  it("dos recientes con el mismo nombre y distinto destino no salen como dos chips iguales", () => {
    const r = unirAccesos(
      [a("/solicitudes", "Solicitudes")],
      [a("/cotizaciones", "Cotizaciones"), a("/cotizaciones/abc", "Cotizaciones"), a("/personas", "Personas")],
      4,
    );
    expect(r.map((x) => x.etiqueta)).toEqual(["Solicitudes", "Cotizaciones", "Personas"]);
  });
  it("sin acentos ni mayúsculas el nombre cuenta igual", () => {
    const r = unirAccesos([], [a("/a", "Cotización"), a("/b", "cotizacion")], 4);
    expect(r).toHaveLength(1);
  });
  it("un fijado nunca se esconde, aunque un reciente anterior de la lista tenga su nombre", () => {
    const r = unirAccesos([a("/cotizaciones/abc", "Cotizaciones")], [a("/cotizaciones", "Cotizaciones")], 4);
    expect(r.map((x) => x.href)).toEqual(["/cotizaciones/abc"]);
  });
  it("respeta el máximo y el orden: fijados primero", () => {
    const r = unirAccesos([a("/f", "F")], [a("/1", "Uno"), a("/2", "Dos"), a("/3", "Tres")], 3);
    expect(r.map((x) => x.href)).toEqual(["/f", "/1", "/2"]);
  });
});

describe("canonicalizarReciente", () => {
  it("la ficha con el título de su sección cuenta como la sección", () => {
    expect(canonicalizarReciente(a("/cotizaciones/abc", "Cotizaciones"), menu).href).toBe("/cotizaciones");
  });
  it("una ficha con título propio conserva su destino", () => {
    expect(canonicalizarReciente(a("/personas/abc", "Ana Pérez"), menu).href).toBe("/personas/abc");
  });
  it("normaliza la ruta guardada", () => {
    expect(canonicalizarReciente(a("/personas/", "Personas"), menu).href).toBe("/personas");
  });
});

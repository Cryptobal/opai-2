import { describe, expect, it } from "vitest";

import { listaComoLeida, listaConUnaLeida } from "@/app/_components/novedades/aplicar-leida";

describe("listaComoLeida", () => {
  it("quita el estado de no leída al tiro", () => {
    const item = { id: "a", leida: false };
    const destacada = { id: "b", leida: false };
    const lista = listaComoLeida({
      items: [item, destacada],
      noLeidas: 2,
      destacadaPendiente: destacada,
    });
    expect(lista.noLeidas).toBe(0);
    expect(lista.destacadaPendiente).toBeNull();
    expect(lista.items.every((entrada) => entrada.leida)).toBe(true);
  });
});

describe("listaConUnaLeida", () => {
  const base = () => {
    const a = { id: "a", leida: false };
    const b = { id: "b", leida: false };
    const c = { id: "c", leida: true };
    return { items: [a, b, c], noLeidas: 2, destacadaPendiente: b };
  };

  it("marca solo la novedad pinchada y baja el contador", () => {
    const r = listaConUnaLeida(base())("a");
    expect(r.items.map((i) => i.leida)).toEqual([true, false, true]);
    expect(r.noLeidas).toBe(1);
    expect(r.destacadaPendiente?.id).toBe("b");
  });

  it("limpia la destacada si era la pinchada", () => {
    expect(listaConUnaLeida(base())("b").destacadaPendiente).toBeNull();
  });

  it("no cambia nada si ya estaba leída o no existe", () => {
    const datos = base();
    expect(listaConUnaLeida(datos)("c")).toBe(datos);
    expect(listaConUnaLeida(datos)("zzz")).toBe(datos);
  });
});

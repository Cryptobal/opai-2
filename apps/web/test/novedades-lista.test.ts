import { describe, expect, it } from "vitest";

import { listaComoLeida } from "@/app/_components/novedades/aplicar-leida";

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

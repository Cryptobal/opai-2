import { describe, expect, it } from "vitest";

import { pantallasPortalSinPatron } from "@/lib/portales-lista-ficha-patron";

describe("portales: listas y fichas usan ListScreen / DetailScreen (CAR-589)", () => {
  it("las pantallas declaradas sin exención montan el patrón CAR-545", () => {
    const violaciones = pantallasPortalSinPatron();
    const msg = violaciones.map(
      (v) => `${v.pantalla.portal} ${v.pantalla.ruta} (${v.pantalla.tipo}): ${v.motivo}`,
    );
    expect(msg, msg.join("\n") || "conforme").toEqual([]);
  });
});
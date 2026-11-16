import { describe, expect, it } from "vitest";

import { avisosPendientes } from "@/app/(erp)/finanzas/flujo/_componentes/avisos-cerrados";

const a = (abonoId: string) => ({ abonoId, mensaje: abonoId });

describe("avisos de cobro que se pueden cerrar (CAR-537)", () => {
  it("muestra cada aviso pendiente y esconde los ya cerrados", () => {
    expect(avisosPendientes([a("1"), a("2")], ["1"]).map((x) => x.abonoId)).toEqual(["2"]);
  });

  it("un aviso nuevo vuelve a aparecer aunque los anteriores estén cerrados", () => {
    expect(avisosPendientes([a("1"), a("3")], ["1", "2"]).map((x) => x.abonoId)).toEqual(["3"]);
  });

  it("si no hay avisos nuevos, no queda nada que mostrar", () => {
    expect(avisosPendientes([a("1")], ["1"])).toEqual([]);
  });
});

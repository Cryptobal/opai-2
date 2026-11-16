import { describe, expect, it } from "vitest";

import { pantallasDuplicadasNoDeclaradas } from "@/lib/pantallas-duplicadas";

describe("pantallas: una sola ruta canónica por componente (CAR-580)", () => {
  it("no hay rutas distintas que monten la misma pantalla sin alias declarado", () => {
    const dup = pantallasDuplicadasNoDeclaradas();
    const msg = dup.map((d) => `${d.rutas.join(" | ")} (${d.huella.slice(0, 80)})`);
    expect(msg, msg.join("\n") || "sin duplicados").toEqual([]);
  });
});
import { describe, expect, it } from "vitest";

import { LIMITES_JORNADA_DEFECTO, limitesSuperados, lunesDeSemana } from "./limites-jornada";

describe("limitesSuperados", () => {
  const cfg = LIMITES_JORNADA_DEFECTO;

  it("no alerta antes de la vigencia", () => {
    expect(limitesSuperados(cfg, "2024-04-25", 800, 3000, 0)).toEqual([]);
  });

  it("aviso a 40 h y crítico a 42 h semanales", () => {
    expect(limitesSuperados(cfg, "2024-05-01", 480, 40 * 60, 0)).toEqual(["semanal_aviso"]);
    expect(limitesSuperados(cfg, "2024-05-01", 480, 42 * 60, 0)).toEqual(["semanal"]);
    expect(limitesSuperados(cfg, "2024-05-01", 480, 43 * 60, 0)).toEqual(["semanal"]);
  });

  it("límite diario y extra", () => {
    expect(limitesSuperados(cfg, "2024-05-01", 12 * 60 + 1, 0, 0)).toEqual(["diario"]);
    expect(limitesSuperados(cfg, "2024-05-01", 600, 0, 121)).toEqual(["extra_diario"]);
  });
});

describe("lunesDeSemana", () => {
  it("devuelve el lunes ISO de la fecha", () => {
    expect(lunesDeSemana("2026-11-05")).toBe("2026-11-02");
    expect(lunesDeSemana("2026-11-09")).toBe("2026-11-09");
  });
});
import { describe, expect, it } from "vitest";

import { textoDias, textoHorario } from "@/lib/cpq-puesto-detalle";

describe("detalle de puesto", () => {
  it("resume los días", () => {
    expect(textoDias([1, 2, 3, 4, 5, 6, 7])).toBe("Lunes a domingo");
    expect(textoDias([1, 2, 3, 4, 5])).toBe("Lun a Vie");
    expect(textoDias([1, 3, 5])).toBe("Lun, Mié, Vie");
    expect(textoDias([6, 7])).toBe("Sáb, Dom");
    expect(textoDias([])).toBeNull();
    expect(textoDias(undefined)).toBeNull();
  });
  it("arma el horario solo si está completo", () => {
    expect(textoHorario("08:00", "20:00")).toBe("08:00–20:00");
    expect(textoHorario("08:00", null)).toBeNull();
  });
});

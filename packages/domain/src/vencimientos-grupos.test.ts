import { describe, expect, it } from "vitest";

import { agruparVencimientos, etiquetaRelativa } from "./vencimientos-grupos";

const HOY = "2026-11-09";
const doc = (id: string, venceEn: string | null) => ({ id, venceEn });

describe("agruparVencimientos", () => {
  it("separa vencidos, hasta 30 y hasta 60 días, y ordena cada grupo por fecha", () => {
    const g = agruparVencimientos(
      [
        doc("a", "2026-12-20"), // 41 días
        doc("b", "2026-10-25"), // vencido
        doc("c", "2026-11-30"), // 21 días
        doc("d", "2026-11-09"), // hoy
        doc("e", "2026-10-12"), // vencido, más antiguo
      ],
      HOY,
    );
    expect(g.map((x) => x.id)).toEqual(["vencidos", "hasta-30", "hasta-60"]);
    expect(g[0]?.items.map((i) => i.id)).toEqual(["e", "b"]);
    expect(g[1]?.items.map((i) => i.id)).toEqual(["d", "c"]);
    expect(g[2]?.items.map((i) => i.id)).toEqual(["a"]);
  });

  it("los bordes: 30 y 60 días exactos entran; 61 y los sin fecha no", () => {
    const g = agruparVencimientos(
      [doc("a", "2026-12-09"), doc("b", "2027-01-08"), doc("c", "2027-01-09"), doc("d", null)],
      HOY,
    );
    expect(g.map((x) => x.id)).toEqual(["hasta-30", "hasta-60"]);
    expect(g[0]?.items.map((i) => i.dias)).toEqual([30]);
    expect(g[1]?.items.map((i) => i.dias)).toEqual([60]);
  });

  it("omite los grupos vacíos y acepta otras ventanas", () => {
    expect(agruparVencimientos([doc("a", "2026-12-01")], HOY, [15, 90]).map((x) => x.id)).toEqual([
      "hasta-90",
    ]);
    expect(agruparVencimientos([], HOY)).toEqual([]);
  });

  it("un documento que vence en 16 días entra en la banda de 30", () => {
    const g = agruparVencimientos([doc("a", "2026-11-25")], HOY);
    expect(g.map((x) => x.id)).toEqual(["hasta-30"]);
    expect(g[0]?.items[0]?.dias).toBe(16);
  });

  it("asigna tono: vencidos peligro, primera banda aviso, siguientes informativo", () => {
    const g = agruparVencimientos(
      [doc("a", "2026-11-01"), doc("b", "2026-11-20"), doc("c", "2026-12-20")],
      HOY,
    );
    expect(g.map((x) => x.tono)).toEqual(["danger", "warning", "info"]);
  });
});

describe("etiquetaRelativa", () => {
  it("usa el texto del diseño y el singular", () => {
    expect(etiquetaRelativa(-18)).toBe("Venció hace 18 días");
    expect(etiquetaRelativa(-1)).toBe("Venció hace 1 día");
    expect(etiquetaRelativa(0)).toBe("Vence hoy");
    expect(etiquetaRelativa(1)).toBe("En 1 día");
    expect(etiquetaRelativa(22)).toBe("En 22 días");
  });
});

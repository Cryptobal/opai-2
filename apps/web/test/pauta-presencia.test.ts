import { describe, expect, it } from "vitest";

import { etiquetaPresencia, horaChile } from "../app/(erp)/pauta/_componentes/presencia";
import type { CeldaDia } from "../app/(erp)/pauta/_componentes/tipos";

const base: CeldaDia = {
  fecha: "2026-11-30",
  estado: "cubierto",
  motivo: null,
  excepcion: false,
  feriado: null,
  titularId: null,
};

describe("presencia en la Pauta", () => {
  it("sin presencia no muestra nada (módulo apagado o sin permiso)", () => {
    expect(etiquetaPresencia(base)).toBeNull();
  });

  it("muestra la hora de entrada y salida en hora de Chile", () => {
    // 21:00 UTC del 30-nov = 18:00 en Santiago (UTC-3 en verano).
    expect(horaChile("2026-11-30T21:00:00.000Z")).toBe("18:00");
    const e = etiquetaPresencia({
      ...base,
      presencia: { personaId: "p", estado: "presente", entrada: "2026-11-30T21:00:00.000Z", salida: null, atrasoMin: 5 },
    });
    expect(e).toMatchObject({ texto: "Asistió", tono: "success" });
    expect(e?.detalle).toBe("entrada 18:00 · atraso 5 min");
  });

  it("marca la entrada sin salida y la ausencia", () => {
    const mk = (estado: "incompleto" | "ausente") =>
      etiquetaPresencia({ ...base, presencia: { personaId: "p", estado, entrada: null, salida: null, atrasoMin: 0 } });
    expect(mk("incompleto")?.texto).toBe("Sin salida");
    expect(mk("ausente")?.tono).toBe("danger");
  });
});

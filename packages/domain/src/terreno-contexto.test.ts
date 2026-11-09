import { describe, expect, it } from "vitest";

import { estadoDelTurno, TURNO_PROXIMO_MS, TURNO_RECIENTE_MS, ventanaDeTurnos } from "./terreno-contexto";

const t = (iso: string) => new Date(iso);

describe("estado del turno", () => {
  const inicio = t("2026-11-07T08:00:00Z");
  const fin = t("2026-11-07T20:00:00Z");
  it("[inicio, fin): en el instante de inicio ya está en curso y en el de fin ya terminó", () => {
    expect(estadoDelTurno(inicio, fin, t("2026-11-07T07:59:59Z"))).toBe("proximo");
    expect(estadoDelTurno(inicio, fin, inicio)).toBe("en_curso");
    expect(estadoDelTurno(inicio, fin, t("2026-11-07T19:59:59Z"))).toBe("en_curso");
    expect(estadoDelTurno(inicio, fin, fin)).toBe("terminado");
  });
  it("la ventana de consulta cubre el cambio de turno y las próximas horas", () => {
    const ahora = t("2026-11-07T12:00:00Z");
    const v = ventanaDeTurnos(ahora);
    expect(ahora.getTime() - v.desde.getTime()).toBe(TURNO_RECIENTE_MS);
    expect(v.hasta.getTime() - ahora.getTime()).toBe(TURNO_PROXIMO_MS);
  });
});

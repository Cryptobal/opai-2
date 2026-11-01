import { describe, expect, it } from "vitest";

import { sugerirReemplazos, type GuardiaReemplazo } from "./reemplazos";
import type { PatronPauta, SeriePauta } from "./tipos";

const P4X4: PatronPauta = { clase: "ciclico", diasTrabajo: 4, diasDescanso: 4, diasSemana: [] };

const serie = (extra: Partial<SeriePauta> & { puestoId: string; puestoNombre: string }): GuardiaReemplazo["series"][number] => ({
  id: "s1",
  patron: P4X4,
  inicioCiclo: "2026-10-01",
  titularId: "titular",
  desde: "2026-01-01",
  hasta: null,
  horaInicio: "08:00",
  horaFin: "20:00",
  ...extra,
});

describe("sugerirReemplazos", () => {
  it("prioriza misma instalación y sin conflictos", () => {
    const guardias: GuardiaReemplazo[] = [
      {
        personaId: "ana",
        instalacionId: "i2",
        series: [serie({ puestoId: "p2", puestoNombre: "Otro", titularId: "ana" })],
      },
      {
        personaId: "luis",
        instalacionId: "i1",
        series: [serie({ puestoId: "p3", puestoNombre: "Acceso", titularId: "luis", inicioCiclo: "2026-10-05" })],
      },
    ];
    const r = sugerirReemplazos(guardias, {
      puestoId: "p1",
      instalacionId: "i1",
      fecha: "2026-10-02",
      patron: P4X4,
      inicioCiclo: "2026-10-01",
      horaInicio: "08:00",
      horaFin: "20:00",
      horasTurno: 12,
    });
    expect(r[0]?.personaId).toBe("luis");
    expect(r[0]?.mismaInstalacion).toBe(true);
  });

  it("marca doblaje cuando los turnos se solapan", () => {
    const guardias: GuardiaReemplazo[] = [
      {
        personaId: "juan",
        instalacionId: "i1",
        series: [
          {
            ...serie({ puestoId: "p2", puestoNombre: "Noche", titularId: "juan" }),
            horaInicio: "20:00",
            horaFin: "08:00",
          },
        ],
      },
    ];
    const r = sugerirReemplazos(guardias, {
      puestoId: "p1",
      instalacionId: "i1",
      fecha: "2026-10-02",
      patron: P4X4,
      inicioCiclo: "2026-10-01",
      horaInicio: "08:00",
      horaFin: "20:00",
      horasTurno: 12,
    });
    expect(r[0]?.conflictos.some((c) => c.includes("Doblaría"))).toBe(true);
  });
});

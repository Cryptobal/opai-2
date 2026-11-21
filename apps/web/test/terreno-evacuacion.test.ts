import { describe, expect, it } from "vitest";

import { diaOperativoChile, textoEvacuacion } from "@/lib/terreno/evacuacion-cifrado";
import type { SnapshotEvacuacion } from "@/lib/terreno/evacuacion-tipos";

describe("evacuación portería (CAR-631)", () => {
  it("usa el día calendario en America/Santiago", () => {
    const dia = diaOperativoChile(new Date("2026-11-17T03:00:00.000Z"));
    expect(dia).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("arma un texto exportable sin el documento completo", () => {
    const snap: SnapshotEvacuacion = {
      dia: "2026-11-16",
      sincronizadoEn: Date.UTC(2026, 10, 16, 15, 0),
      items: [
        {
          id: "a",
          clave: "b",
          nombre: "Ana Pérez",
          empresa: "Acme",
          tipoRegistro: "Visita",
          documento: "••••1234",
          entradaEn: "2026-11-16T18:00:00.000Z",
        },
      ],
    };
    const t = textoEvacuacion(snap);
    expect(t).toContain("Ana Pérez");
    expect(t).toContain("••••1234");
    expect(t).not.toContain("14000000");
  });
});
import { describe, expect, it } from "vitest";

import { actividadHilo } from "@/app/_components/hilo/actividad-hilo";
import { rutaDeEntidad } from "@/lib/ruta-entidad";

// CAR-339: cada fila de actividad lleva a la ficha que cambió, si tiene una.
const ID = "0190f3a2-7b1c-7d2e-8f00-123456789abc";

describe("enlace de la actividad a su ficha", () => {
  it("arma la ruta de las fichas conocidas y no inventa las demás", () => {
    expect(rutaDeEntidad({ tipo: "cotizacion", id: ID })).toBe(`/cotizaciones/${ID}`);
    expect(rutaDeEntidad({ tipo: "persona", id: ID })).toBe(`/personas/${ID}`);
    expect(rutaDeEntidad({ tipo: "api_key", id: ID })).toBeUndefined();
    expect(rutaDeEntidad({ tipo: "cuenta", id: "../otra" })).toBeUndefined();
    expect(rutaDeEntidad(null)).toBeUndefined();
  });

  it("el hilo enlaza la fila solo si hay ficha", () => {
    const base = { cuando: "2026-11-11T14:05:00Z", actor: { nombre: "Ana", agente: false } };
    const [con, sin] = actividadHilo(
      [
        {
          ...base,
          id: "1",
          accion: "aprobó la cotización",
          entidad: { tipo: "cotizacion", id: ID },
        },
        { ...base, id: "2", accion: "realizó un cambio en Finanzas", entidad: null },
      ],
      new Date("2026-11-11T15:00:00Z"),
    );
    expect(con?.href).toBe(`/cotizaciones/${ID}`);
    expect(sin && "href" in sin).toBe(false);
  });
});

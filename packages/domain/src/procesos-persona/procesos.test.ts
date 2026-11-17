import { describe, expect, it } from "vitest";

import {
  conPasoDevolverInventario,
  esContinuidad,
  pasosProcesoPorVertical,
  plantillaEfectiva,
  procesoCompleto,
  TITULO_PASO_DEVOLVER_INVENTARIO,
  venceDe,
} from "./procesos";

describe("procesos de ingreso y salida (CAR-355)", () => {
  it("usa la plantilla de la vertical si la empresa no tiene una válida", () => {
    expect(plantillaEfectiva(null, "seguridad", "ingreso").some((p) => p.titulo.includes("OS-10"))).toBe(true);
    expect(plantillaEfectiva([], "aseo", "salida")[0]?.titulo).toContain("uniforme");
    expect(plantillaEfectiva([{ titulo: "x" }], "seguridad", "salida")).toEqual(
      pasosProcesoPorVertical("seguridad", "salida"),
    );
  });

  it("usa la plantilla propia de la empresa cuando es válida", () => {
    const propia = [{ titulo: "Entregar notebook", plazoDias: 2 }];
    expect(plantillaEfectiva(propia, "seguridad", "ingreso")).toEqual(propia);
  });

  it("una vertical sin plantilla propia usa los pasos legales base", () => {
    expect(pasosProcesoPorVertical("mantenimiento", "ingreso")[0]?.titulo).toBe("Firmar contrato de trabajo");
  });

  it("calcula el vencimiento en días corridos, también hacia atrás y entre meses", () => {
    expect(venceDe("2026-11-25", 10)).toBe("2026-12-05");
    expect(venceDe("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("la lista se cierra sin pasos por hacer", () => {
    expect(procesoCompleto(["hecho", "omitido"])).toBe(true);
    expect(procesoCompleto(["hecho", "por_hacer"])).toBe(false);
    expect(procesoCompleto([])).toBe(false);
  });

  it("detecta continuidad: traslado o recontratación al día siguiente", () => {
    expect(esContinuidad("2026-11-12", ["2026-11-11"])).toBe(true);
    expect(esContinuidad("2026-11-12", ["2026-11-12"])).toBe(true);
    expect(esContinuidad("2026-11-12", ["2026-10-01", null])).toBe(false);
    expect(esContinuidad("2026-11-12", [])).toBe(false);
  });

  it("añade Devolver inventario tras uniforme cuando Inventario está activo (CAR-503)", () => {
    const salida = pasosProcesoPorVertical("seguridad", "salida");
    const con = conPasoDevolverInventario(salida, true);
    const i = con.findIndex((p) => p.titulo === TITULO_PASO_DEVOLVER_INVENTARIO);
    expect(i).toBeGreaterThan(0);
    expect(con[i - 1]?.titulo).toContain("uniforme");
    expect(conPasoDevolverInventario(con, true)).toEqual(con);
    expect(conPasoDevolverInventario(salida, false)).toEqual(salida);
  });
});

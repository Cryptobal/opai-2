import { describe, expect, it } from "vitest";

import { calcular as motor } from "./calcular";
import { itemPrueba, modeloPrueba, parametrosPrueba, proveedorPrueba, puestoPrueba, versionPrueba } from "./fixtures";
import type { AjusteCosto, VersionCalculo } from "./tipos";

const modelo = () => {
  const m = modeloPrueba();
  m.valores = { feriados_anuales: 0 };
  return m;
};
const calcular = (v: VersionCalculo) => motor(v, modelo(), parametrosPrueba, proveedorPrueba(300_000));
// Un puesto 4x4 12 h = 2 personas × 300.000 = 600.000 de mano de obra; margen 20 % sobre venta.
const base = (ajustes?: AjusteCosto[]): VersionCalculo => ({
  ...versionPrueba([puestoPrueba({ id: "p1" })]),
  margenPct: 200_000,
  ...(ajustes ? { ajustes } : {}),
});

describe("costos manuales por categoría (CAR-162)", () => {
  it("sin ajustes el resultado es idéntico al de siempre", () => {
    const sin = calcular(base());
    expect(calcular(base([]))).toEqual(sin);
    expect(sin.costoMensual).toBe(600_000);
    expect(sin.ventaMensual).toBe(750_000);
  });

  it("un costo global suma al costo, a la categoría, a la venta y mantiene el margen", () => {
    const r = calcular(base([{ id: "a1", categoria: "uniformes", montoClp: 100_000 }]));
    expect(r.costoMensual).toBe(700_000);
    expect(r.categorias.find((c) => c.id === "uniformes")?.costoMensual).toBe(100_000);
    expect(r.ventaMensual).toBe(875_000);
    expect(r.margenEfectivoPct).toBe(200_000);
    expect(r.traza.some((t) => t.item === "ajuste:a1")).toBe(true);
  });

  it("un costo de puesto usa el margen de la sección del puesto; el global, el de la cotización", () => {
    const secciones = (ajuste: AjusteCosto): VersionCalculo => ({
      ...versionPrueba([puestoPrueba({ id: "pa", seccion: "a" }), puestoPrueba({ id: "pb", seccion: "b" })]),
      margenPct: 200_000,
      margenesSeccion: [
        { seccion: "a", margenPct: 200_000 },
        { seccion: "b", margenPct: 500_000 },
      ],
      ajustes: [ajuste],
    });
    // A: 600.000 / 0,8 = 750.000. B con 100.000 propio: 700.000 / 0,5 = 1.400.000.
    const enPuesto = calcular(secciones({ id: "x", categoria: "examenes", montoClp: 100_000, puestoId: "pb" }));
    expect(enPuesto.costoMensual).toBe(1_300_000);
    expect(enPuesto.ventaMensual).toBe(2_150_000);
    // Global: B 1.200.000 + A 750.000 + 100.000 / 0,8 = 125.000.
    const global = calcular(secciones({ id: "x", categoria: "examenes", montoClp: 100_000 }));
    expect(global.costoMensual).toBe(1_300_000);
    expect(global.ventaMensual).toBe(2_075_000);
    expect(enPuesto.categorias.find((c) => c.id === "examenes")?.costoMensual).toBe(100_000);
  });

  it("el costo de un puesto deshabilitado no cuenta; uno inexistente se rechaza", () => {
    const v = versionPrueba([puestoPrueba({ id: "p1" }), puestoPrueba({ id: "p2", habilitada: false })]);
    const ok = calcular({ ...v, ajustes: [{ id: "a", categoria: "vehiculos", montoClp: 50_000, puestoId: "p2" }] });
    expect(ok.costoMensual).toBe(600_000);
    expect(() => calcular({ ...v, ajustes: [{ id: "a", categoria: "vehiculos", montoClp: 5, puestoId: "nada" }] })).toThrow("inexistente");
  });

  it("valida dinero entero no negativo, categoría conocida, feriados y duplicados", () => {
    const con = (a: AjusteCosto[]) => () => calcular({ ...base(), ajustes: a });
    expect(con([{ id: "a", categoria: "uniformes", montoClp: -1 }])).toThrow("no negativo");
    expect(con([{ id: "a", categoria: "uniformes", montoClp: 10.5 }])).toThrow("entero");
    expect(con([{ id: "a", categoria: "feriados", montoClp: 1 }])).toThrow("Feriados");
    expect(con([{ id: "a", categoria: "inventada", montoClp: 1 }])).toThrow("Categoría rota");
    const dup: AjusteCosto = { id: "a", categoria: "uniformes", montoClp: 1 };
    expect(con([dup, dup])).toThrow("duplicado");
  });

  it("convive con líneas de ítem de catálogo sin duplicarlas", () => {
    const v: VersionCalculo = { ...base([{ id: "a", categoria: "equipamiento", montoClp: 20_000 }]) };
    v.lineas = [...v.lineas, itemPrueba(80_000)];
    const r = calcular(v);
    expect(r.categorias.find((c) => c.id === "equipamiento")?.costoMensual).toBe(100_000);
    expect(r.costoMensual).toBe(700_000);
  });
});

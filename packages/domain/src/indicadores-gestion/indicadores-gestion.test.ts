import { describe, expect, it } from "vitest";

import {
  erroresDefinicionIndicador,
  logroDeMeta,
  porcentajeDe,
  rangoDelPeriodo,
  semaforoDeLogro,
  tareaATiempo,
  tareaCuenta,
  TOPE_LOGRO,
  type DefinicionIndicador,
} from "./index";

const base: DefinicionIndicador = {
  id: "comercial.ventas_cerradas",
  nombre: "Ventas cerradas",
  descripcion: "Monto mensual de los negocios ganados por la persona.",
  tipo: "resultado",
  unidad: "clp",
  sentido: "mayor",
  sujeto: "usuario",
  metaSugerida: 10_000_000,
  origen: "negocios ganados",
};

describe("erroresDefinicionIndicador", () => {
  it("acepta una definición completa de su módulo", () => {
    expect(erroresDefinicionIndicador(base, "comercial")).toEqual([]);
  });
  it("rechaza un id de otro módulo o mal formado", () => {
    expect(erroresDefinicionIndicador(base, "pauta")).toHaveLength(1);
    expect(erroresDefinicionIndicador({ ...base, id: "Ventas" }, "comercial")).toHaveLength(1);
    expect(erroresDefinicionIndicador({ ...base, id: "comercial.a.b" }, "comercial")).toHaveLength(1);
  });
  it("exige nombre, descripción y origen con contenido", () => {
    const errores = erroresDefinicionIndicador(
      { ...base, nombre: " a ", descripcion: "corta", origen: " " },
      "comercial",
    );
    expect(errores).toHaveLength(3);
  });
  it("exige una meta sugerida mayor que cero y porcentajes hasta 100", () => {
    expect(erroresDefinicionIndicador({ ...base, metaSugerida: 0 }, "comercial")).toHaveLength(1);
    expect(erroresDefinicionIndicador({ ...base, metaSugerida: Number.NaN }, "comercial")).toHaveLength(1);
    expect(
      erroresDefinicionIndicador({ ...base, unidad: "porcentaje", metaSugerida: 101 }, "comercial"),
    ).toHaveLength(1);
    expect(
      erroresDefinicionIndicador({ ...base, unidad: "porcentaje", metaSugerida: 100 }, "comercial"),
    ).toEqual([]);
  });
  it("rechaza tipo, unidad, sentido o sujeto fuera de la lista", () => {
    // Object.assign deja pasar valores fuera de la lista, como llegarían desde un manifiesto mal escrito.
    const rota: DefinicionIndicador = Object.assign({}, base, {
      tipo: "acciones",
      unidad: "kg",
      sentido: "igual",
      sujeto: "cargo",
    });
    expect(erroresDefinicionIndicador(rota, "comercial")).toHaveLength(4);
  });
});

describe("logroDeMeta", () => {
  it("más es mejor: valor sobre meta, con tope", () => {
    expect(logroDeMeta(300, 600, "mayor")).toBe(0.5);
    expect(logroDeMeta(600, 600, "mayor")).toBe(1);
    expect(logroDeMeta(6000, 600, "mayor")).toBe(TOPE_LOGRO);
    expect(logroDeMeta(0, 600, "mayor")).toBe(0);
  });
  it("menos es mejor: meta sobre valor, y cero es el mejor resultado", () => {
    expect(logroDeMeta(3, 3, "menor")).toBe(1);
    expect(logroDeMeta(6, 3, "menor")).toBe(0.5);
    expect(logroDeMeta(1, 3, "menor")).toBe(TOPE_LOGRO);
    expect(logroDeMeta(0, 3, "menor")).toBe(TOPE_LOGRO);
  });
  it("sin dato o sin meta válida no hay logro, que no es logro cero", () => {
    expect(logroDeMeta(null, 600, "mayor")).toBeNull();
    expect(logroDeMeta(Number.NaN, 600, "mayor")).toBeNull();
    expect(logroDeMeta(10, 0, "mayor")).toBeNull();
    expect(logroDeMeta(10, -5, "menor")).toBeNull();
  });
  it("un valor negativo es logro cero y la razón se redondea a cuatro decimales", () => {
    expect(logroDeMeta(-1, 600, "mayor")).toBe(0);
    expect(logroDeMeta(1, 3, "mayor")).toBe(0.3333);
  });
});

describe("semaforoDeLogro", () => {
  it("verde desde la meta, amarillo desde 85 % y rojo bajo eso", () => {
    expect(semaforoDeLogro(1.2)).toBe("verde");
    expect(semaforoDeLogro(1)).toBe("verde");
    expect(semaforoDeLogro(0.9999)).toBe("amarillo");
    expect(semaforoDeLogro(0.85)).toBe("amarillo");
    expect(semaforoDeLogro(0.8499)).toBe("rojo");
  });
});

describe("rangoDelPeriodo", () => {
  it("abarca el mes civil en la zona de la empresa", () => {
    const r = rangoDelPeriodo("2026-11", "America/Santiago");
    // Noviembre en Chile continental: UTC−3.
    expect(r.desde.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(r.hasta.toISOString()).toBe("2026-12-01T03:00:00.000Z");
  });
  it("respeta el cambio de hora dentro del mes", () => {
    // Julio en Chile continental: UTC−4.
    const r = rangoDelPeriodo("2026-07", "America/Santiago");
    expect(r.desde.toISOString()).toBe("2026-07-01T04:00:00.000Z");
    expect(r.hasta.toISOString()).toBe("2026-08-01T04:00:00.000Z");
  });
  it("diciembre termina en enero del año siguiente", () => {
    expect(rangoDelPeriodo("2026-12", "UTC").hasta.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
  it("rechaza un período que no es aaaa-mm", () => {
    expect(() => rangoDelPeriodo("2026-13", "UTC")).toThrow();
    expect(() => rangoDelPeriodo("2026-1", "UTC")).toThrow();
  });
});

describe("tareas a tiempo", () => {
  const zona = "America/Santiago";
  const vence = new Date("2026-11-10T15:00:00.000Z");
  const tarea = { estado: "hecha", vencimiento: vence, completadaEn: vence, todoElDia: false };

  it("con hora: a tiempo hasta el instante del vencimiento", () => {
    expect(tareaATiempo(tarea, zona)).toBe(true);
    expect(tareaATiempo({ ...tarea, completadaEn: new Date(vence.getTime() + 1) }, zona)).toBe(false);
  });
  it("de todo el día: a tiempo hasta el final de ese día en la zona de la empresa", () => {
    // 10-nov 23:30 en Santiago = 11-nov 02:30 UTC: sigue siendo el día del vencimiento.
    const tarde = { ...tarea, todoElDia: true, completadaEn: new Date("2026-11-11T02:30:00.000Z") };
    expect(tareaATiempo(tarde, zona)).toBe(true);
    const alOtroDia = { ...tarde, completadaEn: new Date("2026-11-11T03:30:00.000Z") };
    expect(tareaATiempo(alOtroDia, zona)).toBe(false);
  });
  it("pendiente no está a tiempo y cancelada no cuenta", () => {
    expect(tareaATiempo({ ...tarea, estado: "pendiente", completadaEn: null }, zona)).toBe(false);
    const despues = new Date(vence.getTime() + 1);
    expect(tareaCuenta({ ...tarea, estado: "cancelada" }, despues)).toBe(false);
    expect(tareaCuenta({ ...tarea, estado: "pendiente" }, despues)).toBe(true);
  });
  it("una pendiente que aún no vence no cuenta; una hecha por adelantado sí", () => {
    const antes = new Date(vence.getTime() - 1);
    expect(tareaCuenta({ ...tarea, estado: "pendiente", completadaEn: null }, antes)).toBe(false);
    expect(tareaCuenta(tarea, antes)).toBe(true);
  });
  it("porcentaje con un decimal y sin base no hay indicador", () => {
    expect(porcentajeDe(2, 3)).toBe(66.7);
    expect(porcentajeDe(3, 3)).toBe(100);
    expect(porcentajeDe(0, 4)).toBe(0);
    expect(porcentajeDe(0, 0)).toBeNull();
  });
});

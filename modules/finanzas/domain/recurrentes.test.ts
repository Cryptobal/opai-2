import { describe, expect, it } from "vitest";

import { estadoOcurrencias, ocurrenciasDe, type Recurrente } from "./recurrentes";

const base: Recurrente = { frecuencia: "mensual", diaDelMes: 5, inicio: "2026-08-04", fin: null, repeticiones: null };

describe("ocurrenciasDe", () => {
  it("mensual en el día pedido, desde el inicio y hasta el horizonte", () => {
    expect(ocurrenciasDe(base, "2026-08-01", "2026-11-30")).toEqual(["2026-08-05", "2026-09-05", "2026-10-05", "2026-11-05"]);
  });
  it("el día 31 se ajusta al último día de los meses cortos (también febrero bisiesto)", () => {
    const r = { ...base, diaDelMes: 31, inicio: "2028-01-01" };
    expect(ocurrenciasDe(r, "2028-01-01", "2028-04-30")).toEqual(["2028-01-31", "2028-02-29", "2028-03-31", "2028-04-30"]);
  });
  it("el día −1 es siempre el último día del mes", () => {
    expect(ocurrenciasDe({ ...base, diaDelMes: -1, inicio: "2026-02-01" }, "2026-02-01", "2026-03-31")).toEqual(["2026-02-28", "2026-03-31"]);
  });
  it("la primera ocurrencia nunca es anterior al inicio", () => {
    expect(ocurrenciasDe({ ...base, diaDelMes: 1, inicio: "2026-09-20" }, "2026-09-01", "2026-11-30")).toEqual(["2026-10-01", "2026-11-01"]);
  });
  it("semanal y quincenal cuentan desde el inicio", () => {
    expect(ocurrenciasDe({ ...base, frecuencia: "semanal", inicio: "2026-11-02" }, "2026-11-01", "2026-11-20")).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
    expect(ocurrenciasDe({ ...base, frecuencia: "quincenal", inicio: "2026-11-02" }, "2026-11-10", "2026-12-15")).toEqual(["2026-11-16", "2026-11-30", "2026-12-14"]);
  });
  it("termina en la fecha de fin o tras N repeticiones, lo que ocurra primero (contadas desde el inicio, no desde el horizonte)", () => {
    expect(ocurrenciasDe({ ...base, fin: "2026-10-31" }, "2026-08-01", "2027-12-31")).toHaveLength(3);
    const conTope = { ...base, diaDelMes: 25, inicio: "2026-09-25", repeticiones: 3 };
    expect(ocurrenciasDe(conTope, "2026-10-01", "2027-12-31")).toEqual(["2026-10-25", "2026-11-25"]);
    expect(ocurrenciasDe({ ...conTope, fin: "2026-10-31" }, "2026-01-01", "2027-12-31")).toEqual(["2026-09-25", "2026-10-25"]);
  });
  it("rango vacío o invertido: sin ocurrencias", () => {
    expect(ocurrenciasDe(base, "2026-12-01", "2026-11-01")).toEqual([]);
    expect(ocurrenciasDe({ ...base, fin: "2026-07-01" }, "2026-01-01", "2026-12-31")).toEqual([]);
  });
});

describe("estadoOcurrencias", () => {
  const fechas = ["2026-10-05", "2026-11-05", "2026-12-05"];
  it("una ocurrencia queda pagada cuando un cargo de su fila cae en su ventana; cada cargo paga una sola", () => {
    const r = estadoOcurrencias(fechas, 150_000, [
      { id: "c1", fecha: "2026-10-03", monto: 150_000 },
      { id: "c2", fecha: "2026-11-09", monto: 150_000 },
    ], { diasAntes: 5, diasDespues: 10 });
    expect(r.map((o) => [o.fecha, o.estado, o.cargoId])).toEqual([
      ["2026-10-05", "pagada", "c1"],
      ["2026-11-05", "pagada", "c2"],
      ["2026-12-05", "proyectada", null],
    ]);
  });
  it("un cargo fuera de la ventana no paga; un pago parcial deja proyectado el resto", () => {
    const r = estadoOcurrencias(fechas, 150_000, [
      { id: "c1", fecha: "2026-09-20", monto: 150_000 },
      { id: "c2", fecha: "2026-11-05", monto: 100_000 },
    ], { diasAntes: 5, diasDespues: 10 });
    expect(r[0]).toMatchObject({ estado: "proyectada", pendiente: 150_000 });
    expect(r[1]).toMatchObject({ estado: "parcial", pendiente: 50_000, cargoId: "c2" });
  });
  it("dos cargos del mismo día y monto pagan dos ocurrencias distintas, no una dos veces", () => {
    const r = estadoOcurrencias(["2026-10-05", "2026-10-12"], 80_000, [
      { id: "a", fecha: "2026-10-08", monto: 80_000 },
      { id: "b", fecha: "2026-10-08", monto: 80_000 },
    ], { diasAntes: 7, diasDespues: 7 });
    expect(r.map((o) => o.cargoId)).toEqual(["a", "b"]);
  });
});

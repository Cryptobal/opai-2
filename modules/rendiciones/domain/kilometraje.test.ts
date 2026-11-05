import { describe, expect, it } from "vitest";

import { calcularKilometraje, type ConfigKilometraje, configDesdeAjustes, type EntradaViaje } from "./kilometraje";

const base: ConfigKilometraje = {
  version: 1, metodo: "consumo", rendimientoKmL: 10, precioLitroClp: 1500, recargoPct: 100_000, tarifaKmClp: 250,
  tramos: [{ nombre: "Santiago–Rancagua", montoClp: 18_000 }],
};
const viaje: EntradaViaje = { km: 100, idaYVuelta: false, peajeClp: 0 };
const monto = (c: ConfigKilometraje, v = viaje) => {
  const r = calcularKilometraje(c, v);
  if (!r.ok) throw new Error(r.mensaje);
  return r;
};

describe("kilometraje · consumo", () => {
  it("100 km, 10 km/l, $1.500/l, recargo 10 % y peaje $2.000 → 15.000 + 1.500 + 2.000 = 18.500", () => {
    const r = monto(base, { ...viaje, peajeClp: 2000 });
    expect(r.lineas.map((l) => [l.concepto, l.montoClp])).toEqual([["Combustible", 15_000], ["Desgaste del vehículo", 1500], ["Peaje", 2000]]);
    expect(r.montoClp).toBe(18_500);
  });
  it("ida y vuelta duplica los km", () => {
    expect(monto(base, { ...viaje, idaYVuelta: true }).montoClp).toBe(33_000);
    expect(monto(base, { ...viaje, idaYVuelta: true }).kmEfectivos).toBe(200);
  });
  it("redondea a peso entero, mitad hacia arriba: 1 km a 4 km/l y $1.502/l → 375,5 → 376; desgaste 37,6 → 38", () => {
    const r = monto({ ...base, rendimientoKmL: 4, precioLitroClp: 1502 }, { ...viaje, km: 1 });
    expect(r.lineas[0]?.montoClp).toBe(376);
    expect(r.lineas[1]?.montoClp).toBe(38);
    // 7,3 km a 9,5 km/l y $1.289/l: 73 × 1289 / 95 = 990,49 → 990
    expect(monto({ ...base, rendimientoKmL: 9.5, precioLitroClp: 1289 }, { ...viaje, km: 7.3 }).lineas[0]?.montoClp).toBe(990);
  });
  it("recargo 0 % deja el desgaste en 0 sin romper el total", () => {
    expect(monto({ ...base, recargoPct: 0 }).montoClp).toBe(15_000);
  });
});

describe("kilometraje · tarifa por km y tramo fijo", () => {
  const tarifa = { ...base, metodo: "tarifa_km" };
  it("$250/km con 100 km → 25.000, más peaje", () => {
    expect(monto(tarifa).montoClp).toBe(25_000);
    expect(monto(tarifa, { ...viaje, peajeClp: 1000 }).montoClp).toBe(26_000);
  });
  it("tarifa con decimal de km: 12,5 km × 250 = 3.125", () => {
    expect(monto(tarifa, { ...viaje, km: 12.5 }).montoClp).toBe(3125);
  });
  it("tramo fijo → monto del tramo (sin multiplicar por ida y vuelta) + peaje", () => {
    const t = { ...base, metodo: "tramo_fijo" };
    expect(monto(t, { ...viaje, tramo: "Santiago–Rancagua", idaYVuelta: true, peajeClp: 500 }).montoClp).toBe(18_500);
  });
});

describe("kilometraje · errores", () => {
  const motivo = (c: ConfigKilometraje, v = viaje) => {
    const r = calcularKilometraje(c, v);
    return r.ok ? "ok" : r.motivo;
  };
  it("km 0 o negativo", () => {
    expect(motivo(base, { ...viaje, km: 0 })).toBe("km_invalido");
    expect(motivo(base, { ...viaje, km: -5 })).toBe("km_invalido");
    expect(motivo({ ...base, metodo: "tramo_fijo" }, { ...viaje, km: -1, tramo: "Santiago–Rancagua" })).toBe("km_invalido");
    expect(motivo(base, { ...viaje, km: Number.NaN })).toBe("km_invalido");
  });
  it("sin método: mensaje de negocio claro", () => {
    const r = calcularKilometraje({ ...base, metodo: "" }, viaje);
    expect(r).toEqual({ ok: false, motivo: "sin_configurar", mensaje: "Tu empresa aún no configura el kilometraje" });
  });
  it("método desconocido y configuración incompleta", () => {
    expect(motivo({ ...base, metodo: "magia" })).toBe("metodo_desconocido");
    expect(motivo({ ...base, rendimientoKmL: 0 })).toBe("config_incompleta");
    expect(motivo({ ...base, precioLitroClp: 0 })).toBe("config_incompleta");
    expect(motivo({ ...base, metodo: "tarifa_km", tarifaKmClp: 0 })).toBe("config_incompleta");
    expect(motivo({ ...base, metodo: "tramo_fijo", tramos: [] })).toBe("config_incompleta");
  });
  it("tramo inexistente y peaje inválido", () => {
    expect(motivo({ ...base, metodo: "tramo_fijo" }, { ...viaje, tramo: "otro" })).toBe("tramo_invalido");
    expect(motivo(base, { ...viaje, peajeClp: -1 })).toBe("peaje_invalido");
    expect(motivo(base, { ...viaje, peajeClp: 10.5 })).toBe("peaje_invalido");
  });
});

describe("configDesdeAjustes", () => {
  it("escala el porcentaje entero a PCT_ESCALA", () => {
    const c = configDesdeAjustes({ metodo: "consumo", rendimientoKmL: 10, precioLitroClp: 1500, recargoPorcentaje: 10, tarifaKmClp: 0, tramos: [] });
    expect(c.recargoPct).toBe(100_000);
    expect(c.version).toBe(1);
  });
});

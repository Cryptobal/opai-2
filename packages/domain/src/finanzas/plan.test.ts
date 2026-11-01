import { describe, expect, it } from "vitest";

import { PLANTILLA_CHILENA } from "./plan-plantilla";
import { type CuentaPlan, NATURALEZA_HABITUAL, TIPOS_CUENTA } from "./plan-tipos";
import { clavesFaltantes, validarCuenta, validarPlan } from "./plan-validacion";

const cuenta = (c: Partial<CuentaPlan>): CuentaPlan => ({
  codigo: "1.1.99",
  nombre: "Cuenta de prueba",
  tipo: "activo",
  naturaleza: "deudora",
  grupo: "corriente",
  exigeCentroCosto: false,
  aceptaAsientos: true,
  padreCodigo: null,
  claveSistema: null,
  activa: true,
  ...c,
});

describe("plantilla chilena base", () => {
  it("no trae errores de validación", () => {
    expect(validarPlan(PLANTILLA_CHILENA).filter((a) => a.severidad === "error")).toEqual([]);
  });

  it("incluye las cuentas que Compras necesita", () => {
    expect(clavesFaltantes(PLANTILLA_CHILENA)).toEqual([]);
  });

  it("deudores por venta e IVA crédito son activo corriente; IVA débito, pasivo corriente", () => {
    const por = (k: string) => PLANTILLA_CHILENA.find((c) => c.claveSistema === k);
    expect(por("deudores_por_venta")).toMatchObject({ tipo: "activo", grupo: "corriente" });
    expect(por("iva_credito")).toMatchObject({ tipo: "activo", grupo: "corriente" });
    expect(por("iva_debito")).toMatchObject({ tipo: "pasivo", grupo: "corriente" });
  });

  it("los códigos son únicos y cada cuenta usa la naturaleza de su tipo salvo contra-cuentas", () => {
    const codigos = PLANTILLA_CHILENA.map((c) => c.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
    const inusuales = PLANTILLA_CHILENA.filter((c) => c.naturaleza !== NATURALEZA_HABITUAL[c.tipo]);
    expect(inusuales.map((c) => c.nombre)).toEqual(["Depreciación acumulada"]);
  });

  it("las cuentas de gasto y costo operativas exigen centro de costo", () => {
    const exigen = PLANTILLA_CHILENA.filter((c) => c.exigeCentroCosto);
    expect(exigen.length).toBeGreaterThan(5);
    expect(exigen.every((c) => c.tipo === "costo" || c.tipo === "gasto")).toBe(true);
  });

  it("cubre los seis tipos de cuenta", () => {
    expect(new Set(PLANTILLA_CHILENA.map((c) => c.tipo))).toEqual(new Set(TIPOS_CUENTA));
  });
});

describe("validarCuenta", () => {
  it("rechaza deudores por venta en el grupo no corriente (el error de 1.0)", () => {
    const a = validarCuenta(cuenta({ claveSistema: "deudores_por_venta", grupo: "no_corriente" }));
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ codigo: "GRUPO_INCORRECTO", severidad: "error" });
  });

  it("rechaza IVA débito como pasivo no corriente (el otro error de 1.0)", () => {
    const a = validarCuenta(
      cuenta({ claveSistema: "iva_debito", tipo: "pasivo", naturaleza: "acreedora", grupo: "no_corriente" }),
    );
    expect(a.map((x) => x.codigo)).toEqual(["GRUPO_INCORRECTO"]);
  });

  it("rechaza IVA crédito si no es activo", () => {
    const a = validarCuenta(
      cuenta({ claveSistema: "iva_credito", tipo: "pasivo", naturaleza: "acreedora", grupo: "corriente" }),
    );
    expect(a.map((x) => x.codigo)).toEqual(["TIPO_INCORRECTO"]);
  });

  it("exige grupo en activos y pasivos de movimiento, no en los títulos", () => {
    expect(validarCuenta(cuenta({ grupo: null })).map((x) => x.codigo)).toEqual(["GRUPO_FALTANTE"]);
    expect(validarCuenta(cuenta({ grupo: null, aceptaAsientos: false }))).toEqual([]);
  });

  it("no admite grupo en una cuenta de resultado", () => {
    const a = validarCuenta(cuenta({ tipo: "gasto", grupo: "corriente" }));
    expect(a.map((x) => x.codigo)).toEqual(["GRUPO_NO_APLICA"]);
  });

  it("avisa, sin bloquear, una naturaleza inusual", () => {
    const a = validarCuenta(cuenta({ naturaleza: "acreedora" }));
    expect(a).toEqual([expect.objectContaining({ codigo: "NATURALEZA_INUSUAL", severidad: "aviso" })]);
  });
});

describe("validarPlan", () => {
  it("detecta códigos repetidos, padres inexistentes y de otro tipo, y claves repetidas", () => {
    const codigos = validarPlan([
      cuenta({ codigo: "1.1.01" }),
      cuenta({ codigo: "1.1.01" }),
      cuenta({ codigo: "1.1.02", padreCodigo: "9.9" }),
      cuenta({ codigo: "6.1", tipo: "gasto", naturaleza: "deudora", grupo: null }),
      cuenta({ codigo: "6.1.1", padreCodigo: "1.1.01", tipo: "gasto", naturaleza: "deudora", grupo: null }),
      cuenta({ codigo: "1.1.10", claveSistema: "bancos" }),
      cuenta({ codigo: "1.1.11", claveSistema: "bancos" }),
    ]).map((a) => a.codigo);
    expect(codigos).toEqual(
      expect.arrayContaining(["CODIGO_DUPLICADO", "PADRE_INEXISTENTE", "PADRE_DE_OTRO_TIPO", "CLAVE_REPETIDA"]),
    );
  });

  it("avisa de las claves que faltan para operar compras", () => {
    expect(clavesFaltantes([cuenta({ claveSistema: "iva_credito" })])).toEqual([
      "deudores_por_venta",
      "iva_debito",
      "proveedores",
    ]);
  });
});

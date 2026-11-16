import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { escribirCambios, leerCambios, leerTexto, suscribir } from "@/app/(erp)/finanzas/flujo/_componentes/almacen-filas-abiertas";

const guardado = new Map<string, string>();
const almacenamiento = {
  getItem: (k: string) => guardado.get(k) ?? null,
  setItem: (k: string, v: string) => void guardado.set(k, v),
};

describe("estado abierto/cerrado de la planilla, por persona (CAR-537)", () => {
  beforeEach(() => {
    guardado.clear();
    vi.stubGlobal("localStorage", almacenamiento);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lo guardado vuelve en la próxima lectura y es de cada persona y empresa", () => {
    escribirCambios("ana", { "grp:gastos": false, "cobro-cli:x": true });
    expect(leerCambios(leerTexto("ana"))).toEqual({ "grp:gastos": false, "cobro-cli:x": true });
    expect(leerCambios(leerTexto("luis"))).toEqual({});
  });

  it("avisa a quien escucha cuando cambia", () => {
    const aviso = vi.fn();
    vi.stubGlobal("window", { addEventListener: () => undefined, removeEventListener: () => undefined });
    const baja = suscribir(aviso);
    escribirCambios("ana", { "sec:egresos": false });
    baja();
    escribirCambios("ana", { "sec:egresos": true });
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it("sin almacenamiento sigue funcionando mientras dure la pestaña", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    });
    escribirCambios("sin-almacen", { "grp:gastos": false });
    expect(leerCambios(leerTexto("sin-almacen"))).toEqual({ "grp:gastos": false });
  });

  it("ignora lo guardado que no sirve", () => {
    expect(leerCambios("no es json")).toEqual({});
    expect(leerCambios("[1,2]")).toEqual({});
    expect(leerCambios('{"a":true,"b":"x"}')).toEqual({ a: true });
  });
});

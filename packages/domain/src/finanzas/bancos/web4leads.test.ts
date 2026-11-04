import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  normalizarBanco,
  normalizarNumeroCuenta,
  planificarMovimientosApi,
  verificarFirmaWeb4leads,
  type MovimientoApiEntrada,
} from "./web4leads";

const firmar = (s: string, c: string, t: string) => createHmac("sha256", s).update(c + t).digest("hex");
const mov = (o: Partial<MovimientoApiEntrada> & { indice: number }): MovimientoApiEntrada => ({
  idExterno: `x${o.indice}`, fecha: "2026-11-02", monto: -50000, glosa: "Pago proveedor", saldoDespues: null, ...o,
});

describe("verificarFirmaWeb4leads", () => {
  const ahora = 1_800_000_000;
  const ts = String(ahora);
  it("acepta la firma correcta dentro de la ventana", () => {
    expect(verificarFirmaWeb4leads("s3", "{}", ts, firmar("s3", "{}", ts), ahora)).toBe(true);
  });
  it("rechaza secreto distinto, cuerpo alterado, firma mal formada o fuera de ventana", () => {
    expect(verificarFirmaWeb4leads("otro", "{}", ts, firmar("s3", "{}", ts), ahora)).toBe(false);
    expect(verificarFirmaWeb4leads("s3", "{ }", ts, firmar("s3", "{}", ts), ahora)).toBe(false);
    expect(verificarFirmaWeb4leads("s3", "{}", ts, "zz", ahora)).toBe(false);
    expect(verificarFirmaWeb4leads("s3", "{}", ts, firmar("s3", "{}", ts), ahora + 301)).toBe(false);
    expect(verificarFirmaWeb4leads("", "{}", ts, firmar("", "{}", ts), ahora)).toBe(false);
  });
});

describe("normalización", () => {
  it("deja solo dígitos y quita el prefijo BANCO", () => {
    expect(normalizarNumeroCuenta("94-541.158")).toBe("94541158");
    expect(normalizarBanco(" Banco Santander ")).toBe("SANTANDER");
  });
});

describe("planificarMovimientosApi", () => {
  it("un id externo ya guardado es duplicado", () => {
    const [p] = planificarMovimientosApi([mov({ indice: 0, idExterno: "a" })], [
      { claveDedupe: "otra", saldoDespues: null, idExterno: "a" },
    ]);
    expect(p).toMatchObject({ estado: "duplicado", motivo: "id_externo" });
  });
  it("misma huella y mismo saldo que una fila de cartola es la misma operación", () => {
    const base = "2026-11-02|-50000|PAGO PROVEEDOR";
    const [p] = planificarMovimientosApi([mov({ indice: 0, saldoDespues: 900 })], [
      { claveDedupe: base, saldoDespues: 900n, idExterno: null },
    ]);
    expect(p).toMatchObject({ estado: "duplicado", motivo: "mismo_saldo" });
  });
  it("misma huella con saldo distinto en todas las copias es otra operación, no sospechosa", () => {
    const base = "2026-11-02|-50000|PAGO PROVEEDOR";
    const [p] = planificarMovimientosApi([mov({ indice: 0, saldoDespues: 850 })], [
      { claveDedupe: base, saldoDespues: 900n, idExterno: null },
    ]);
    expect(p).toEqual({ indice: 0, estado: "nuevo", claveDedupe: `${base}~2`, sospechoso: false });
  });
  it("misma huella sin saldo que discrimine se inserta con ordinal y queda sospechosa", () => {
    const base = "2026-11-02|-50000|PAGO PROVEEDOR";
    const r = planificarMovimientosApi([mov({ indice: 0 }), mov({ indice: 1 })], [
      { claveDedupe: base, saldoDespues: null, idExterno: null },
    ]);
    expect(r[0]).toMatchObject({ claveDedupe: `${base}~2`, sospechoso: true });
    expect(r[1]).toMatchObject({ claveDedupe: `${base}~3`, sospechoso: true });
  });
  it("el primer movimiento de una huella nueva no es sospechoso y repetir el id en el lote lo descarta", () => {
    const r = planificarMovimientosApi([mov({ indice: 0, idExterno: "q" }), mov({ indice: 1, idExterno: "q" })], []);
    expect(r[0]).toMatchObject({ estado: "nuevo", sospechoso: false });
    expect(r[1]).toMatchObject({ estado: "duplicado", motivo: "id_externo" });
  });
});

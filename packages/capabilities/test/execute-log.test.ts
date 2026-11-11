import { describe, expect, it } from "vitest";

import { codigoDeBase } from "../src/execute-log";

describe("codigoDeBase (log de errores inesperados)", () => {
  it("toma el código de Prisma", () => {
    expect(codigoDeBase(Object.assign(new Error("x"), { code: "P2024" }))).toBe("P2024");
  });
  it("busca en la causa del adaptador de pg", () => {
    const causa = { originalCode: "57P01", kind: "postgres" };
    expect(codigoDeBase(Object.assign(new Error("DriverAdapterError"), { cause: causa }))).toBe(
      "57P01",
    );
  });
  it("sin código, null; nunca devuelve mensajes con espacios", () => {
    expect(codigoDeBase(new Error("boom"))).toBeNull();
    expect(codigoDeBase({ code: "mensaje con espacios y datos" })).toBeNull();
    expect(codigoDeBase("texto")).toBeNull();
  });
});

describe("motivoSeguroDe (CAR-242)", () => {
  it("registra solo un motivo declarado seguro, también desde la causa", async () => {
    const { motivoSeguroDe } = await import("../src/execute-log");
    const { ErrorConMotivo } = await import("../src/errores");
    expect(motivoSeguroDe(new ErrorConMotivo("almacenamiento: no se pudo guardar"))).toBe(
      "almacenamiento: no se pudo guardar",
    );
    expect(motivoSeguroDe(new Error("x", { cause: { motivoSeguro: "SimpleAPI generar: respondió HTTP 400" } }))).toBe(
      "SimpleAPI generar: respondió HTTP 400",
    );
  });
  it("nunca usa error.message: un Error crudo o de Prisma no deja motivo", async () => {
    const { motivoSeguroDe } = await import("../src/execute-log");
    expect(motivoSeguroDe(new Error("Invalid `prisma.dteFolio.update()` input: RUT 12.345.678-5"))).toBeNull();
    expect(motivoSeguroDe(Object.assign(new Error("x"), { code: "P2024" }))).toBeNull();
  });
});

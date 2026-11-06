import { describe, expect, it } from "vitest";

import { codigoDeBase } from "../src/execute-log";

describe("codigoDeBase (log de errores inesperados)", () => {
  it("toma el código de Prisma", () => {
    expect(codigoDeBase(Object.assign(new Error("x"), { code: "P2024" }))).toBe("P2024");
  });
  it("busca en la causa del adaptador de pg", () => {
    const causa = { originalCode: "57P01", kind: "postgres" };
    expect(codigoDeBase(Object.assign(new Error("DriverAdapterError"), { cause: causa }))).toBe("57P01");
  });
  it("sin código, null; nunca devuelve mensajes con espacios", () => {
    expect(codigoDeBase(new Error("boom"))).toBeNull();
    expect(codigoDeBase({ code: "mensaje con espacios y datos" })).toBeNull();
    expect(codigoDeBase("texto")).toBeNull();
  });
});

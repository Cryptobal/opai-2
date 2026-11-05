import { describe, expect, it } from "vitest";

import { ambienteTributarioEfectivo, produccionTributariaHabilitada } from "./entorno";

const OK = { OPAI_PRODUCCION_TRIBUTARIA: "habilitada", BETTER_AUTH_URL: "https://app.opai.cl" };

describe("produccionTributariaHabilitada", () => {
  it("falla cerrado con la variable ausente", () => {
    expect(produccionTributariaHabilitada({ BETTER_AUTH_URL: "https://app.opai.cl" })).toBe(false);
    expect(produccionTributariaHabilitada({})).toBe(false);
  });
  it("falla con otro host aunque la variable esté puesta", () => {
    expect(produccionTributariaHabilitada({ ...OK, BETTER_AUTH_URL: "https://test.opai.cl" })).toBe(false);
    expect(produccionTributariaHabilitada({ ...OK, BETTER_AUTH_URL: "https://app.opai.cl.evil.com" })).toBe(false);
    expect(produccionTributariaHabilitada({ ...OK, BETTER_AUTH_URL: "no es una url" })).toBe(false);
    expect(produccionTributariaHabilitada({ OPAI_PRODUCCION_TRIBUTARIA: "habilitada" })).toBe(false);
  });
  it("falla con un valor distinto de «habilitada»", () => {
    expect(produccionTributariaHabilitada({ ...OK, OPAI_PRODUCCION_TRIBUTARIA: "true" })).toBe(false);
  });
  it("habilita solo con variable y host app.opai.cl", () => {
    expect(produccionTributariaHabilitada(OK)).toBe(true);
  });
});

describe("ambienteTributarioEfectivo", () => {
  it("acota «produccion» a certificación si no está habilitada", () => {
    expect(ambienteTributarioEfectivo("produccion", { BETTER_AUTH_URL: "https://test.opai.cl" })).toBe("certificacion");
  });
  it("respeta producción cuando está habilitada", () => {
    expect(ambienteTributarioEfectivo("produccion", OK)).toBe("produccion");
  });
  it("certificación y valores raros siempre dan certificación", () => {
    expect(ambienteTributarioEfectivo("certificacion", OK)).toBe("certificacion");
    expect(ambienteTributarioEfectivo(undefined, OK)).toBe("certificacion");
    expect(ambienteTributarioEfectivo("otro", OK)).toBe("certificacion");
  });
});

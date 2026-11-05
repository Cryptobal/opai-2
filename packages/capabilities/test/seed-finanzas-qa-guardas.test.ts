import { describe, expect, it } from "vitest";

import { leerDestino } from "../scripts/seed-finanzas-qa-guardas";

const ok = {
  OPAI_ENTORNO: "dev",
  DATABASE_URL: "postgresql://a:b@h1:5432/db",
  DATABASE_URL_MIGRATE: "postgresql://c:d@h1:5432/db",
};

describe("seed:finanzas-qa · guardas", () => {
  it("acepta un tenant qa-* en la misma base y simula por defecto", () => {
    expect(leerDestino(["--tenant", "qa-finanzas"], ok)).toEqual({ slug: "qa-finanzas", confirmar: false });
    expect(leerDestino(["--tenant", "qa-finanzas", "--confirmar"], ok).confirmar).toBe(true);
  });
  it("rechaza sin OPAI_ENTORNO=dev, en producción o sin tenant", () => {
    expect(() => leerDestino(["--tenant", "qa-x"], { ...ok, OPAI_ENTORNO: undefined })).toThrow(/desarrollo/);
    expect(() => leerDestino(["--tenant", "qa-x"], { ...ok, NODE_ENV: "production" })).toThrow(/desarrollo/);
    expect(() => leerDestino([], ok)).toThrow(/tenant de QA/);
    expect(() => leerDestino(["--tenant", "--confirmar"], ok)).toThrow(/tenant de QA/);
  });
  it("rechaza el tenant real y cualquier slug sin prefijo qa-", () => {
    expect(() => leerDestino(["--tenant", "gard"], ok)).toThrow(/no es un tenant de QA/);
    expect(() => leerDestino(["--tenant", "otra-empresa"], ok)).toThrow(/qa-/);
  });
  it("rechaza URLs que apuntan a bases distintas o faltan", () => {
    const otra = { ...ok, DATABASE_URL: "postgresql://a:b@h2:5432/db" };
    expect(() => leerDestino(["--tenant", "qa-x"], otra)).toThrow(/misma base/);
    expect(() => leerDestino(["--tenant", "qa-x"], { ...ok, DATABASE_URL: undefined })).toThrow(/Falta/);
  });
});

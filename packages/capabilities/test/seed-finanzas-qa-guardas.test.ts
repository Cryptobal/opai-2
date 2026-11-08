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

  it("destino qa-aislado: solo con la guarda completa y solo las dos empresas de QA", () => {
    const aislado = {
      OPAI_ENTORNO: "qa-aislado",
      OPAI_QA_DESTINO: "opai2-qa-aislado",
      DATABASE_URL: "postgresql://opai_app:b@h1:5432/opai2_qa",
      DATABASE_URL_MIGRATE: "postgresql://dueno:d@h1:5432/opai2_qa",
      SII_ADAPTADOR: "simulado",
      CESION_ADAPTADOR: "simulado",
    };
    expect(leerDestino(["--tenant", "qa-finanzas-a"], aislado)).toEqual({ slug: "qa-finanzas-a", confirmar: false });
    expect(() => leerDestino(["--tenant", "qa-finanzas-a"], { ...aislado, OPAI_QA_DESTINO: undefined })).toThrow(/no autorizado/);
    expect(() => leerDestino(["--tenant", "qa-finanzas-a"], { ...aislado, DATABASE_URL: "postgresql://opai_app:b@h1:5432/neondb", DATABASE_URL_MIGRATE: "postgresql://dueno:d@h1:5432/neondb" })).toThrow(/opai2_qa/);
    expect(() => leerDestino(["--tenant", "qa-otra"], aislado)).toThrow(/no es una empresa del QA aislado/);
    expect(() => leerDestino(["--tenant", "gard"], aislado)).toThrow();
  });
});

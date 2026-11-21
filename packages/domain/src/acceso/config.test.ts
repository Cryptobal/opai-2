import { describe, expect, it } from "vitest";

import {
  camposDelTipo,
  CONFIG_ACCESO_DEFECTO as D,
  configEfectiva,
  documentoSegun,
  excedePermanencia,
  faltaObligatorio,
} from "./config";

describe("configuración de acceso (CAR-479)", () => {
  it("la instalación reemplaza entera a la empresa; sin ninguna rige la de fábrica", () => {
    const empresa = { ...D, validarRut: false };
    const propia = { ...D, permitirFueraDeLista: true };
    expect(configEfectiva(null, null)).toBe(D);
    expect(configEfectiva(empresa, null)).toBe(empresa);
    expect(configEfectiva(empresa, propia)).toBe(propia);
  });

  it("pide los campos activos y, en un vehículo, siempre la patente", () => {
    expect(camposDelTipo(D, "visita").map((f) => f.id)).toEqual(["empresa", "motivo"]);
    expect(camposDelTipo(D, "vehiculo").map((f) => f.id)).toEqual(["empresa", "motivo", "patente"]);
  });

  it("detecta el primer obligatorio vacío", () => {
    const c = {
      ...D,
      campos: [
        ...D.campos,
        { id: "c_1", etiqueta: "Departamento", activo: true, obligatorio: true },
      ],
    };
    expect(faltaObligatorio(c, "visita", { c_1: "  " })).toBe("Departamento");
    expect(faltaObligatorio(c, "visita", { c_1: "301" })).toBeNull();
  });

  it("sin validar RUT, un RUN con dígito equivocado queda como documento chileno", () => {
    const d = { tipo: "run" as const, numero: "12.345.678-9" };
    expect(documentoSegun(true, d)).toBeNull();
    expect(documentoSegun(false, d)).toMatchObject({ tipo: "otro", clave: "CL:123456789" });
    expect(documentoSegun(false, { tipo: "run", numero: "12.345.678-5" })?.tipo).toBe("run");
  });

  it("marca la permanencia excedida solo con límite", () => {
    const hace2h = new Date(Date.now() - 2 * 3_600_000).toISOString();
    expect(excedePermanencia(null, hace2h, new Date())).toBe(false);
    expect(excedePermanencia(60, hace2h, new Date())).toBe(true);
    expect(excedePermanencia(180, hace2h, new Date())).toBe(false);
  });
});

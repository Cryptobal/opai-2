import { describe, expect, it } from "vitest";

import { datosCuenta, planCuentas } from "../../scripts/importar-opai1/cuentas";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import type { CuentaOpai1 } from "../../scripts/importar-opai1/origen";
import {
  cuentaListaParaFacturar,
  faltantesTributarios,
  tributarioCompleto,
} from "../../scripts/importar-opai1/tributario";
import { avisosTributariosCuentas, resumenTributario } from "../../scripts/importar-opai1/tributario-plan";

const cuentaCompleta = (extra: Partial<CuentaOpai1> = {}): CuentaOpai1 => ({
  id: "acc-x",
  name: "Cliente Demo SpA",
  legalName: "Cliente Demo SpA",
  rut: "76.111.111-6",
  giro: "Servicios de seguridad",
  address: "Av. Providencia 100",
  commune: "Providencia",
  city: "Santiago",
  emailDte: "dte@ejemplo.test",
  industry: null,
  segment: null,
  size: null,
  createdAt: "2025-01-01T12:00:00.000Z",
  updatedAt: "2025-01-01T12:00:00.000Z",
  ...extra,
});

describe("datos tributarios de cuenta", () => {
  it("mapea campos de 1.0 a core.cuentas (sin depender de integración DTE)", () => {
    const d = datosCuenta(cuentaCompleta());
    expect(d.rut).toBe("76111111-6");
    expect(d.giro).toBe("Servicios de seguridad");
    expect(d.calle).toBe("Av. Providencia 100");
    expect(d.comuna).toBe("Providencia");
    expect(d.ciudad).toBe("Santiago");
    expect(d.emailDte).toBe("dte@ejemplo.test");
    expect(tributarioCompleto(d)).toBe(true);
    expect(cuentaListaParaFacturar(d)).toBe(true);
  });

  it("razón social nunca se rellena con el nombre de fantasía", () => {
    const d = datosCuenta(cuentaCompleta({ legalName: null, name: "Marca visible" }));
    expect(d.razonSocial).toBeNull();
    const plan = planCuentas([cuentaCompleta({ legalName: null })], estadoVacio());
    expect(plan.avisos).toContainEqual({ codigo: "cuenta_no_lista_sin_razon_social", idOpai1: "acc-x" });
    expect(resumenTributario(plan.decisiones).listasParaFacturar).toBe(0);
  });

  it("dry-run marca faltantes sin inventar defaults", () => {
    const d = datosCuenta(cuentaCompleta({ giro: null, emailDte: null }));
    expect(faltantesTributarios(d).sort()).toEqual(["email_dte", "giro"]);
    const plan = planCuentas([cuentaCompleta({ giro: null })], estadoVacio());
    expect(avisosTributariosCuentas(plan.decisiones)).toEqual([
      { codigo: "tributario_incompleto", idOpai1: "acc-x" },
    ]);
    expect(resumenTributario(plan.decisiones)).toMatchObject({
      cuentasConsideradas: 1,
      listasParaFacturar: 0,
      incompletas: 1,
    });
  });
});

// CAR-124: insignias de las tarjetas del Resumen de la ficha de persona (export ficha-persona v1 «Resumen»).
import { describe, expect, it } from "vitest";

import {
  cuentaCorta,
  diasHasta,
  estadoJornada,
  estadoOs10,
  estadoPago,
  estadoPrevision,
  estadoUniforme,
  estadoVencimiento,
} from "../app/(erp)/personas/_componentes/estado-ficha";

const HOY = "2026-11-11";
const cuenta = {
  bancoCodigo: "012",
  tipoCuenta: "rut",
  numeroCuenta: "****4821",
  rutTitular: "11111111-1",
  bancoNombre: "BancoEstado",
  tipoCuentaEtiqueta: "Cuenta RUT",
  porCorregir: false,
};

describe("insignias del Resumen de la ficha (CAR-124)", () => {
  it("vencimientos: vigente, vence en N días, vence hoy y vencido", () => {
    expect(diasHasta(HOY, "2026-11-26")).toBe(15);
    expect(estadoVencimiento(HOY, "2026-11-26")).toEqual({
      tono: "warning",
      etiqueta: "Vence en 15 días",
    });
    expect(estadoVencimiento(HOY, "2026-11-12")?.etiqueta).toBe("Vence mañana");
    expect(estadoVencimiento(HOY, HOY)).toEqual({ tono: "danger", etiqueta: "Vence hoy" });
    expect(estadoVencimiento(HOY, "2026-09-12")).toEqual({ tono: "danger", etiqueta: "Vencido" });
    expect(estadoVencimiento(HOY, "2027-03-01")).toEqual({ tono: "success", etiqueta: "Vigente" });
    expect(estadoVencimiento(HOY, null)).toBeNull();
  });
  it("previsión completa con AFP y salud; isapre exige nombre", () => {
    expect(
      estadoPrevision({ afp: "Habitat", sistemaSalud: "Fonasa", isapreNombre: null }).etiqueta,
    ).toBe("Completo");
    expect(
      estadoPrevision({ afp: "Habitat", sistemaSalud: "Isapre", isapreNombre: null }).etiqueta,
    ).toBe("Incompleto");
    expect(
      estadoPrevision({ afp: null, sistemaSalud: "Fonasa", isapreNombre: null }).etiqueta,
    ).toBe("Incompleto");
  });
  it("pago: completo, incompleto, cambio pendiente y banco por corregir", () => {
    expect(estadoPago(cuenta, false).etiqueta).toBe("Completo");
    expect(estadoPago({ ...cuenta, rutTitular: null }, false).etiqueta).toBe("Incompleto");
    expect(estadoPago(cuenta, true).etiqueta).toBe("Cambio pendiente");
    expect(estadoPago({ ...cuenta, porCorregir: true }, true).etiqueta).toBe("Banco por corregir");
    expect(cuentaCorta(cuenta)).toBe("BancoEstado · Cuenta RUT · ••••4821");
    expect(
      cuentaCorta({
        ...cuenta,
        bancoCodigo: null,
        tipoCuenta: null,
        numeroCuenta: null,
        bancoNombre: null,
        tipoCuentaEtiqueta: null,
      }),
    ).toBeNull();
  });
  it("uniforme cuenta las tallas faltantes", () => {
    const u = { tallaCamisa: "L", tallaPantalon: "44", tallaChaqueta: "L", tallaZapato: "42" };
    expect(estadoUniforme(u).etiqueta).toBe("Completo");
    expect(estadoUniforme({ ...u, tallaCamisa: null }).etiqueta).toBe("Falta 1 talla");
    expect(estadoUniforme(null).etiqueta).toBe("Faltan 4 tallas");
  });
  it("jornada: manda el plazo fijo; sin plazo, completa con horas y distribución", () => {
    const j = { horasSemanales: "42", distribucion: "4x4", terminoPlazoFijo: null };
    expect(estadoJornada(HOY, j).etiqueta).toBe("Completo");
    expect(estadoJornada(HOY, { ...j, distribucion: null }).etiqueta).toBe("Incompleto");
    expect(estadoJornada(HOY, { ...j, terminoPlazoFijo: "2026-11-26" }).etiqueta).toBe(
      "Vence en 15 días",
    );
    expect(estadoJornada(HOY, { ...j, terminoPlazoFijo: "2027-06-01" }).etiqueta).toBe("Al día");
  });
  it("OS-10 sin fecha queda «Sin registro»", () => {
    expect(estadoOs10(HOY, null)).toEqual({ tono: "neutro", etiqueta: "Sin registro" });
    expect(estadoOs10(HOY, { venceEn: "2026-09-12" }).etiqueta).toBe("Vencido");
  });
});
